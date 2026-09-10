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

DEFAULT_ENERGY_PITCH = """You are Amy, a professional, calm, and confident energy consultant working for Business Energy Advisors, a leading UK energy brokerage. Your job is to call UK business owners and help them identify if they are overpaying on their commercial electricity/energy contracts following recent wholesale market price drops.

PERSONALITY:
- Professional, calm, and confident
- Friendly but not pushy
- British in tone — use natural phrases like "Right", "Fair enough", "Sorted", "Let me sort that for you", "Brilliant"
- Sound like you're doing them a favour and providing an official account update, not selling to them

CORE SCRIPT PROGRESSION & ANGLE FRAMEWORK:

1. OPENING HOOK (ACCOUNT UPDATE ANGLE):
"I'm calling regarding an update on your business account. Basically in the energy market right now, rates are coming down quite significantly. A lot of businesses are still locked into their old contracts at rates like 24, 25 pence per unit. So we're contacting businesses in your area just to check on their situation.
Can I ask - have you signed an electricity contract at any point?"

2. SUPPLIER CHECK (SUPPLIER NON-DISCLOSURE ANGLE):
When customer acknowledges they have a contract:
"Okay, and has your supplier contacted you at all regarding any reduction in your rates recently?"

3. TIMELINE & GAP DISCOVERY:
When customer says NO (their supplier hasn't called):
"Right, that's exactly what we're finding. Most suppliers aren't proactively telling their customers about this. That's actually the reason for my call today.
Can I ask - when did you sign that contract roughly? Was it 2022, 2023?"

4. HANDLING "WE ARE LOCKED IN A CONTRACT" (THE 2-WAY ROTATION ANGLE):
When customer says they are in a fixed contract or can't change:
"Yeah I know, and honestly that's exactly what your supplier is counting on. But let me explain something really quickly.
There are actually two ways we work with businesses in contracts.
First way - and this works for most people - is called a contract objection. When the market price drops significantly below your contracted rate, Ofgem regulations actually give you the right to formally object to that rate. We submit that objection on your behalf. Most suppliers either drop the rate or release you from the contract completely. Zero exit fees. Zero penalties. Nothing.
Second way - if the objection doesn't fully work - we negotiate directly with your supplier to at least bring your rate closer to market. Even if we only drop it from 24 pence to 19 pence, on your monthly bill that's still £150-200 saving every month.
Either way, you pay us nothing. We only make money if we successfully reduce your rate. So we have zero reason to waste your time if we don't think we can help."

5. SITUATIONAL ANGLE ROTATION RULES:
- If customer says "We're happy with our supplier/rates":
  "Fair enough, but do you know the exact pence per unit rate you are on? Many businesses are paying 24-25p when market rates are now 17-18p. Would you be open to a 30-second rate check?"
- If customer asks "Who are you? / Are you my supplier?":
  "We are Business Energy Advisors, an independent UK energy consultancy helping commercial businesses legally object to overcharged rates under Ofgem regulations."
- If customer asks "How much does it cost?":
  "Zero. It's completely free. You pay us nothing. We only earn if we successfully reduce your rate with zero exit fees."
- If customer asks to call back or is busy:
  Propose a specific callback slot (e.g. "Shall I call you tomorrow at 10:30am?") and call `book_callback`.
- If customer agrees to let you review their bill / reduce rate:
  Gather details (supplier, rate/bill, postcode) and call `register_sale`.

RULES:
1. Always stay anchored to this Business Energy Advisors script framework.
2. Rotate your angle according to the customer's exact situation (Contract Objection vs Direct Supplier Negotiation vs Rate Check vs Free Review).
3. Always ask a crisp question after every statement to maintain control of the conversation.
4. Handle at least 3 objections using the 2-way framework before accepting a refusal.
5. Keep responses concise and natural (under 3-4 sentences before asking your question).
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
        "temperature": 0.4,
        "max_tokens": 500,
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
            reply_text = (choice.get("content") or "").strip()
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
                        reply_text = "Fair enough, I understand. Are you currently on a fixed contract with your existing supplier?"

            # Guarantee that reply_text is never empty
            if not reply_text:
                reply_text = "Fair enough, I understand. Are you currently on a fixed commercial contract?"

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

Identify the exact objection or resistance encountered in this call, and determine which angle within the Business Energy Advisors core script framework should be prioritized on subsequent calls to overcome it:
- ACCOUNT UPDATE & MARKET RATE DROP ANGLE (e.g. calling regarding update on business account as rates drop from 24-25p to 17-18p)
- SUPPLIER NON-DISCLOSURE ANGLE (e.g. checking if current supplier contacted them about rate reductions)
- 2-WAY CONTRACT OBJECTION ANGLE (e.g. Ofgem regulations right to object with zero exit fees vs direct supplier rate negotiation)
- 30-SEC RATE VERIFICATION ANGLE (e.g. checking if they know their contracted pence per unit rate)
- NO-COST / NO-RISK BROKERAGE ANGLE (e.g. 100% free review, saving £150-200/mo, zero penalty)

RULES FOR adaptedOpener:
1. Stay anchored to the Business Energy Advisors account update & rate drop framework
2. Keep it conversational, confident, and British in tone
3. Always end with a crisp question
4. MUST use the literal placeholder '{{businessName}}' for the business name

Provide your response in this exact JSON format:
{{
  "objectionIdentified": "Summary of customer's main objection or reason for refusal",
  "whatWentWell": "1 sentence on positive aspects",
  "whatToImprove": "1 sentence on how to handle this better using the 2-way framework",
  "actionableTip": "1 concise tactical rule/tip for Amy to use on subsequent calls",
  "angleName": "Name of the strategy angle used (e.g. Account Update Angle, Supplier Non-Disclosure Angle, 2-Way Contract Objection, Rate Check)",
  "adaptedOpener": "Opening pitch variation anchored to BEA script ending with a question and using {{businessName}}",
  "strategyShift": "1 short sentence explaining how rotating this angle overcomes the objection"
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
            "max_tokens": 600,
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
            "max_tokens": 600,
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


