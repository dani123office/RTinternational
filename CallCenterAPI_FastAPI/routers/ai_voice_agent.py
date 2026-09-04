import os
import json
import urllib.request
import urllib.error
from datetime import datetime, date, time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Customer, CallBack, Transfer, Sale, ElectricityMeter, GasMeter
from .auth import get_current_user
from ..utils.logger import log_activity, get_client_ip

router = APIRouter(prefix="/api/ai/voice", tags=["ai_voice_agent"])

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY", "")

DEFAULT_ENERGY_PITCH = """You are Amy, a professional energy consultant working for Business Energy Advisors, a UK energy brokerage. Your job is to call UK business owners and help them identify if they are overpaying on their electricity contracts.

PERSONALITY:
- Professional, calm, and confident
- Friendly but not pushy  
- British in tone — use phrases like "brilliant", "fair enough", "sorted", "let me sort that for you"
- Sound like you're doing them a favour, not selling to them

KNOWLEDGE:
- Old contract rates (2022-2024): 22-27 pence per unit
- Current market rate: 17-18 pence per unit
- Legal process: Deemed Contract Objection (Ofgem Supply Licence Condition 22)
- This process allows mid-contract rate reduction with zero exit fees
- Your service is completely free to businesses
- Supplier must respond within 8 weeks
- 200+ businesses helped, zero penalties

RULES:
1. Never say "electricity" or "energy" in opening line
2. Never mention switching supplier
3. Always ask a question after every statement
4. Handle minimum 3 objections before accepting no
5. Make customers volunteer information naturally
6. Keep responses under 3 sentences before asking a question
7. If customer says "happy" — ask if they know their actual rate
8. Sound official, not salesy
9. Acknowledge every objection before responding
10. Always try email capture if they won't commit

GOAL FOR EACH CALL:
- Primary: Get agreement to proceed with free contract review (invoke `register_sale` tool)
- Secondary: Get email address for follow-up or schedule a specific callback time (invoke `book_callback` tool)
- Minimum: Get supplier name and monthly bill amount

INFORMATION TO COLLECT IN ORDER:
1. Are they on a fixed contract?
2. Has supplier contacted them about reduction?
3. When did they sign?
4. What rate were they quoted?
5. What is their monthly bill?
6. Who is their supplier?
7. Email address

Follow the conversation script provided and adapt naturally to customer responses. Always be ready to handle objections and always try to continue the conversation rather than accepting no.
"""

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "book_callback",
            "description": "Call this when the customer requests a callback for another date or time, or when they want more information sent/discussed later.",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_name": {"type": "string", "description": "Business or customer name"},
                    "phone": {"type": "string", "description": "Customer phone number"},
                    "scheduled_date": {"type": "string", "description": "Date for callback in YYYY-MM-DD format"},
                    "scheduled_time": {"type": "string", "description": "Time for callback in HH:MM format (24hr)"},
                    "reason": {"type": "string", "description": "Brief reason for callback and any specific notes"},
                },
                "required": ["scheduled_date", "reason"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "register_sale",
            "description": "Call this when the customer agrees to proceed with an energy contract renewal, price comparison, or switch.",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_name": {"type": "string", "description": "Business Name"},
                    "contact_name": {"type": "string", "description": "Owner / Decision Maker Name"},
                    "phone": {"type": "string", "description": "Phone number"},
                    "postcode": {"type": "string", "description": "Business Postcode"},
                    "current_supplier": {"type": "string", "description": "Current energy supplier if mentioned"},
                    "mpan": {"type": "string", "description": "Electricity meter MPAN if obtained"},
                    "mprn": {"type": "string", "description": "Gas meter MPRN if obtained"},
                    "contract_end_date": {"type": "string", "description": "Current contract end date if mentioned"},
                    "notes": {"type": "string", "description": "Detailed notes on agreed terms or discussion"}
                },
                "required": ["business_name", "postcode"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "transfer_to_agent",
            "description": "Call this when the customer asks to speak to a senior representative or wants an instant human transfer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_name": {"type": "string", "description": "Business name"},
                    "phone": {"type": "string", "description": "Phone number"},
                    "reason": {"type": "string", "description": "Reason for live transfer"},
                    "notes": {"type": "string", "description": "Key points discussed before transfer"}
                },
                "required": ["reason"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mark_not_interested",
            "description": "Call this when the customer explicitly declines or states they are not interested.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Reason for refusal e.g., in long-term contract, not interested"}
                },
                "required": ["reason"]
            }
        }
    }
]


# Persistent in-memory cache of call learnings and dynamic evolved scripts per user
USER_CALL_LEARNINGS: Dict[int, List[str]] = {}
USER_ADAPTED_PROMPTS: Dict[int, Dict[str, Any]] = {}


class ChatMessage(BaseModel):
    role: str
    content: Optional[str] = None
    name: Optional[str] = None
    tool_call_id: Optional[str] = None


class ConverseRequest(BaseModel):
    messages: List[ChatMessage]
    leadInfo: Optional[Dict[str, Any]] = None
    customPitchPrompt: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "aura-angus-en"  # Natural British Voice or aura-luna-en, aura-asteria-en


class AutoActionRequest(BaseModel):
    actionType: str  # "callback" | "transfer" | "sale"
    payload: Dict[str, Any]
    campaignLeadId: Optional[int] = None


class AnalyzeCallRequest(BaseModel):
    messages: List[ChatMessage]
    leadInfo: Optional[Dict[str, Any]] = None
    outcome: Optional[str] = None


import urllib.request
import urllib.error

@router.post("/reset-script")
def reset_adapted_script(
    current_user: User = Depends(get_current_user),
):
    """Resets dynamically adapted script and learnings back to initial default."""
    if current_user.id in USER_CALL_LEARNINGS:
        USER_CALL_LEARNINGS[current_user.id] = []
    if current_user.id in USER_ADAPTED_PROMPTS:
        del USER_ADAPTED_PROMPTS[current_user.id]
    return {"status": "success", "message": "Script reset to initial default"}


@router.post("/converse")
def ai_converse(
    req: ConverseRequest,
    current_user: User = Depends(get_current_user),
):
    """Processes customer input with Groq and triggers CRM tool calling."""
    api_key = os.environ.get("GROQ_API_KEY", "") or GROQ_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server")

    # Use dynamically adapted system prompt if available, else request prompt, else default
    user_prompt_data = USER_ADAPTED_PROMPTS.get(current_user.id, {})
    system_prompt = req.customPitchPrompt or user_prompt_data.get("adaptedSystemPrompt") or DEFAULT_ENERGY_PITCH

    if req.leadInfo:
        lead_context = (
            f"\n\nCurrent Lead Information:"
            f"\n- Business Name: {req.leadInfo.get('businessName', 'Unknown')}"
            f"\n- Contact Person: {req.leadInfo.get('ownerName', 'Decision Maker')}"
            f"\n- Phone: {req.leadInfo.get('phone', 'Unknown')}"
            f"\n- Postcode: {req.leadInfo.get('postcode', 'Unknown')}"
            f"\n- Notes: {req.leadInfo.get('notes', 'None')}"
        )
        system_prompt += lead_context

    # Inject real-time learnings from previous calls
    user_learnings = USER_CALL_LEARNINGS.get(current_user.id, [])
    if user_learnings:
        recent_tips = "\n".join([f"- {tip}" for tip in user_learnings[-4:]])
        system_prompt += f"\n\nDYNAMIC ADAPTATIONS FROM PREVIOUS CALLS (Apply these to improve conversion):\n{recent_tips}"

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        msg_dict = {"role": m.role, "content": m.content or ""}
        if m.name:
            msg_dict["name"] = m.name
        if m.tool_call_id:
            msg_dict["tool_call_id"] = m.tool_call_id
        formatted_messages.append(msg_dict)

    groq_payload = {
        "model": "openai/gpt-oss-120b",
        "messages": formatted_messages,
        "tools": TOOLS_SCHEMA,
        "tool_choice": "auto",
        "temperature": 0.5,
        "max_tokens": 300,
    }

    try:
        req_data = json.dumps(groq_payload).encode('utf-8')
        request = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=req_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RTInternational/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(request, timeout=15) as response:
            res_body = response.read().decode('utf-8')
            data = json.loads(res_body)
            choice = data["choices"][0]["message"]
            reply_text = choice.get("content") or ""
            tool_calls = choice.get("tool_calls") or []

            parsed_tool = None
            if tool_calls:
                tc = tool_calls[0]
                fn_name = tc["function"]["name"]
                try:
                    fn_args = json.loads(tc["function"]["arguments"])
                except Exception:
                    fn_args = {}
                parsed_tool = {
                    "id": tc.get("id"),
                    "name": fn_name,
                    "args": fn_args
                }

                if not reply_text:
                    if fn_name == "book_callback":
                        dt = fn_args.get("scheduled_date", "tomorrow")
                        tm = fn_args.get("scheduled_time", "")
                        time_str = f" at {tm}" if tm else ""
                        reply_text = f"Perfect, I have noted that down and booked a callback for {dt}{time_str}. Thank you for your time, have a great day!"
                    elif fn_name == "register_sale":
                        b_name = fn_args.get("business_name", "your business")
                        reply_text = f"Fantastic! I have registered your renewal comparison details for {b_name}. We will finalize the contract review for you right away."
                    elif fn_name == "transfer_to_agent":
                        reply_text = "Please hold the line for just a moment while I transfer you over to our senior energy specialist."
                    elif fn_name == "mark_not_interested":
                        reply_text = "No problem at all. Thank you very much for your time today, have a great day!"

            return {
                "replyText": reply_text,
                "toolCall": parsed_tool,
                "usage": data.get("usage", {})
            }
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode('utf-8', errors='ignore')
        raise HTTPException(status_code=err.code, detail=f"Groq API Error: {err_msg}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to reach Groq API: {exc}")


@router.post("/tts")
def deepgram_tts(
    req: TTSRequest,
    current_user: User = Depends(get_current_user),
):
    """Generates natural human voice audio stream using Deepgram Aura TTS."""
    api_key = os.environ.get("DEEPGRAM_API_KEY", "") or DEEPGRAM_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY is not configured on the server")

    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    voice_model = req.voice or "aura-angus-en"
    url = f"https://api.deepgram.com/v1/speak?model={voice_model}"

    try:
        req_data = json.dumps({"text": req.text.strip()}).encode('utf-8')
        request = urllib.request.Request(
            url,
            data=req_data,
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RTInternational/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            audio_bytes = response.read()
            return Response(
                content=audio_bytes,
                media_type="audio/mp3",
                headers={"Cache-Control": "no-cache"}
            )
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode('utf-8', errors='ignore')
        raise HTTPException(status_code=err.code, detail=f"Deepgram TTS Error: {err_msg}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to reach Deepgram API: {exc}")



@router.post("/auto-action")
def execute_auto_action(
    req: AutoActionRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Executes CRM action (Callback, Transfer, Sale) on behalf of the AI Agent."""
    now = datetime.utcnow()
    p = req.payload
    action_type = req.actionType.lower()

    if action_type == "callback":
        cb_date_str = p.get("scheduled_date")
        cb_time_str = p.get("scheduled_time") or "14:00"
        try:
            cb_date = datetime.strptime(cb_date_str, "%Y-%m-%d").date()
        except Exception:
            cb_date = date.today()

        try:
            cb_time_parts = cb_time_str.split(":")
            cb_time = time(int(cb_time_parts[0]), int(cb_time_parts[1]))
        except Exception:
            cb_time = time(14, 0)

        cust_name = p.get("business_name") or "AI Lead Customer"
        cust_phone = p.get("phone") or "N/A"
        cust_postcode = p.get("postcode") or "N/A"

        customer = db.query(Customer).filter(Customer.phone == cust_phone).first() if cust_phone != "N/A" else None
        if not customer:
            customer = Customer(
                business_name=cust_name,
                owner_name=p.get("contact_name") or cust_name,
                phone=cust_phone,
                postcode=cust_postcode,
                user_id=current_user.id,
                created_at=now,
                updated_at=now,
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

        cb = CallBack(
            customer_id=customer.id,
            user_id=current_user.id,
            scheduled_date=cb_date,
            scheduled_time=cb_time,
            notes=f"[AI Voice Agent] {p.get('reason', 'Callback requested')} | {p.get('notes', '')}",
            status="pending",
            created_at=now,
            updated_at=now,
        )
        db.add(cb)
        db.commit()
        db.refresh(cb)

        log_activity(db, current_user.id, "created_callback_ai", "callbacks", cb.id,
                     f"AI Voice Agent booked callback for {cust_name} on {cb_date} at {cb_time}",
                     get_client_ip(request))

        return {"status": "success", "action": "callback", "id": cb.id, "message": "Callback booked successfully"}

    elif action_type == "sale":
        cust_name = p.get("business_name") or "Commercial Energy Customer"
        cust_owner = p.get("contact_name") or cust_name
        cust_phone = p.get("phone") or "N/A"
        cust_postcode = p.get("postcode") or "N/A"

        customer = db.query(Customer).filter(Customer.phone == cust_phone).first() if cust_phone != "N/A" else None
        if not customer:
            customer = Customer(
                business_name=cust_name,
                owner_name=cust_owner,
                phone=cust_phone,
                postcode=cust_postcode,
                user_id=current_user.id,
                created_at=now,
                updated_at=now,
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

        sale = Sale(
            customer_id=customer.id,
            user_id=current_user.id,
            business_name=cust_name,
            owner_name=cust_owner,
            phone=cust_phone,
            postcode=cust_postcode,
            account_number=p.get("account_number") or "",
            mpan=p.get("mpan") or "",
            mprn=p.get("mprn") or "",
            current_supplier=p.get("current_supplier") or "",
            notes=f"[AI Voice Agent Sale] {p.get('notes', 'Agreed energy contract comparison/switch')}",
            progression_status="pending",
            created_at=now,
            updated_at=now,
        )
        db.add(sale)
        db.commit()
        db.refresh(sale)

        log_activity(db, current_user.id, "created_sale_ai", "sales", sale.id,
                     f"AI Voice Agent registered sale for {cust_name} ({cust_postcode})",
                     get_client_ip(request))

        return {"status": "success", "action": "sale", "id": sale.id, "message": "Sale registered successfully"}

    elif action_type == "transfer":
        cust_name = p.get("business_name") or "Live Transfer Customer"
        cust_phone = p.get("phone") or "N/A"
        cust_postcode = p.get("postcode") or "N/A"

        customer = db.query(Customer).filter(Customer.phone == cust_phone).first() if cust_phone != "N/A" else None
        if not customer:
            customer = Customer(
                business_name=cust_name,
                owner_name=cust_name,
                phone=cust_phone,
                postcode=cust_postcode,
                user_id=current_user.id,
                created_at=now,
                updated_at=now,
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

        transfer = Transfer(
            customer_id=customer.id,
            user_id=current_user.id,
            business_name=cust_name,
            phone=cust_phone,
            notes=f"[AI Voice Agent Transfer] {p.get('reason', 'Live customer transfer')} | {p.get('notes', '')}",
            status="pending",
            created_at=now,
            updated_at=now,
        )
        db.add(transfer)
        db.commit()
        db.refresh(transfer)

        log_activity(db, current_user.id, "created_transfer_ai", "transfers", transfer.id,
                     f"AI Voice Agent created live transfer for {cust_name}",
                     get_client_ip(request))

        return {"status": "success", "action": "transfer", "id": transfer.id, "message": "Transfer created successfully"}

    else:
        return {"status": "ignored", "action": action_type, "message": "No CRM creation action required"}


@router.post("/analyze-call")
def analyze_call_debrief(
    req: AnalyzeCallRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyzes completed call transcript with LLM to extract learnings for subsequent calls."""
    api_key = os.environ.get("GROQ_API_KEY", "") or GROQ_API_KEY
    if not api_key:
        return {"status": "skipped", "message": "GROQ_API_KEY not configured"}

    if not req.messages or len(req.messages) <= 1:
        return {"status": "skipped", "message": "Conversation too short to analyze"}

    transcript_lines = []
    for m in req.messages:
        speaker = "Amy (Energy Consultant)" if m.role == "assistant" else "Customer"
        transcript_lines.append(f"{speaker}: {m.content or ''}")
    
    transcript_text = "\n".join(transcript_lines)
    lead_name = req.leadInfo.get("businessName") if req.leadInfo else "Business Lead"

    analysis_prompt = f"""You are a master UK Energy Sales Coach reviewing a sales call transcript for Business Energy Advisors.
Analyze this call between Amy (Agent) and the customer ({lead_name}). Outcome: {req.outcome or 'Call ended'}.

Transcript:
\"\"\"{transcript_text}\"\"\"

Generate a fresh, distinctly evolved opening greeting for Amy on subsequent calls that directly addresses or bypasses this objection.
Choose the best dynamic strategic angle for subsequent calls:
- TARIFF AUDIT ANGLE (e.g. 30-sec tariff check following recent market wholesale rate drop)
- OFGEM REGULATION ANGLE (e.g. Ofgem Condition 22 mid-contract rate reduction with zero exit fees)
- BROKER SURCHARGE AUDIT ANGLE (e.g. checking for hidden broker commissions/surcharges in commercial meters)
- FAST-TRACK VALUE ANGLE (e.g. brief commercial review for commercial rates)

RULES FOR adaptedOpener:
1. Never say "electricity" or "energy" in the opening line
2. Always end with a question asking for the decision maker
3. MUST use the literal placeholder '{{businessName}}' for the business name
4. Make it punchy, conversational, and distinctly different from previous standard lines

Provide your response in this exact JSON format:
{{
  "objectionIdentified": "Summary of customer's main objection or reason for refusal",
  "whatWentWell": "1 sentence on positive aspects",
  "whatToImprove": "1 sentence on how to handle this better",
  "actionableTip": "1 concise tactical rule/tip for Amy to use on subsequent calls",
  "angleName": "Name of the strategy angle used (e.g. Ofgem Mid-Contract Rights, Tariff Audit, Surcharge Review)",
  "adaptedOpener": "Your newly crafted, dynamic opening pitch greeting ending with a question and using {{businessName}}",
  "strategyShift": "1 short sentence explaining why this angle converts better"
}}
"""

    try:
        req_data = json.dumps({
            "model": "openai/gpt-oss-120b",
            "messages": [
                {"role": "system", "content": "You are an elite UK sales performance coach. Always return valid JSON. Always keep {{businessName}} placeholder."},
                {"role": "user", "content": analysis_prompt}
            ],
            "temperature": 0.7,
            "response_format": {"type": "json_object"}
        }).encode('utf-8')

        http_req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=req_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RTInternational/1.0"
            },
            method="POST"
        )

        with urllib.request.urlopen(http_req, timeout=15) as response:
            res_body = response.read().decode('utf-8')
            data = json.loads(res_body)
            raw_json = data["choices"][0]["message"]["content"]
            analysis_data = json.loads(raw_json)

            tip = analysis_data.get("actionableTip") or analysis_data.get("whatToImprove")
            adapted_opener = analysis_data.get("adaptedOpener")
            strategy_shift = analysis_data.get("strategyShift")

            # Guarantee that previous business name is replaced with universal placeholder {businessName}
            if adapted_opener and req.leadInfo and req.leadInfo.get("businessName"):
                prev_bname = req.leadInfo.get("businessName", "").strip()
                if prev_bname and len(prev_bname) >= 3 and prev_bname.lower() in adapted_opener.lower():
                    import re
                    pattern = re.compile(re.escape(prev_bname), re.IGNORECASE)
                    adapted_opener = pattern.sub("{businessName}", adapted_opener)
                    analysis_data["adaptedOpener"] = adapted_opener

            if tip:
                if current_user.id not in USER_CALL_LEARNINGS:
                    USER_CALL_LEARNINGS[current_user.id] = []
                USER_CALL_LEARNINGS[current_user.id].append(tip)
                # Keep last 10 learnings max
                if len(USER_CALL_LEARNINGS[current_user.id]) > 10:
                    USER_CALL_LEARNINGS[current_user.id].pop(0)

            # Update Adapted Script State
            curr_prompt_data = USER_ADAPTED_PROMPTS.get(current_user.id, {})
            version = curr_prompt_data.get("version", 1) + 1

            USER_ADAPTED_PROMPTS[current_user.id] = {
                "version": version,
                "adaptedOpener": adapted_opener,
                "strategyShift": strategy_shift,
                "lastUpdated": datetime.utcnow().isoformat()
            }

            log_activity(
                db, current_user.id, "ai_call_debrief", "campaigns", 0,
                f"AI evolved script (v{version}) for {lead_name}: {strategy_shift or tip[:100]}",
                get_client_ip(request)
            )

            return {
                "status": "success",
                "analysis": analysis_data,
                "learningTip": tip,
                "adaptedOpener": adapted_opener,
                "strategyShift": strategy_shift,
                "scriptVersion": version,
                "totalLearnings": len(USER_CALL_LEARNINGS.get(current_user.id, []))
            }

    except Exception as exc:
        print("Call analysis error:", exc)
        return {"status": "error", "message": str(exc)}


class EvolveScriptRequest(BaseModel):
    preferredAngle: Optional[str] = None
    notes: Optional[str] = None


@router.post("/evolve-script")
def evolve_script_manually(
    req: Optional[EvolveScriptRequest] = None,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generates a fresh dynamic script angle on-demand."""
    api_key = os.environ.get("GROQ_API_KEY", "") or GROQ_API_KEY
    if not api_key:
        return {"status": "error", "message": "GROQ_API_KEY not configured"}

    angle = (req.preferredAngle if req else None) or "Next high-converting UK energy angle"
    
    prompt = f"""You are a master UK energy telemarketing scriptwriter for Business Energy Advisors.
Generate a fresh high-converting opening pitch variation for Amy calling UK businesses.
Target Strategy Angle: {angle}.

RULES:
1. Never say "electricity" or "energy" in the opening line
2. Always end with a crisp question asking for the owner or decision maker
3. Use the exact placeholder '{{businessName}}' for the business name
4. Sound natural, friendly, British, and professional

Provide JSON:
{{
  "angleName": "Name of Angle (e.g. Tariff Audit, Ofgem Mid-Contract Rights, Surcharge Review, Quick Verification)",
  "adaptedOpener": "Opening line ending with question and using {{businessName}}",
  "strategyShift": "1 sentence why this angle hooks decision makers"
}}
"""
    try:
        req_data = json.dumps({
            "model": "openai/gpt-oss-120b",
            "messages": [
                {"role": "system", "content": "You are a master sales scriptwriter. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.8,
            "response_format": {"type": "json_object"}
        }).encode('utf-8')

        http_req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=req_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RTInternational/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(http_req, timeout=12) as response:
            res_body = response.read().decode('utf-8')
            data = json.loads(res_body)
            result = json.loads(data["choices"][0]["message"]["content"])
            
            curr_prompt_data = USER_ADAPTED_PROMPTS.get(current_user.id, {})
            version = curr_prompt_data.get("version", 1) + 1
            
            USER_ADAPTED_PROMPTS[current_user.id] = {
                "version": version,
                "adaptedOpener": result.get("adaptedOpener"),
                "strategyShift": result.get("strategyShift"),
                "angleName": result.get("angleName"),
                "lastUpdated": datetime.utcnow().isoformat()
            }
            return {
                "status": "success",
                "adaptedOpener": result.get("adaptedOpener"),
                "angleName": result.get("angleName"),
                "strategyShift": result.get("strategyShift"),
                "scriptVersion": version
            }
    except Exception as exc:
        print("Evolve script error:", exc)
        return {"status": "error", "message": str(exc)}


