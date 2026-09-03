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

DEFAULT_ENERGY_PITCH = """You are 'Alex', an expert, polite, and energetic British Energy Specialist calling on behalf of RT International (a leading UK commercial utility consultancy).
Your objective is to help UK businesses review and slash their commercial electricity and gas contracts before impending price hikes.

Key Guidelines:
1. Speak naturally, professionally, and concisely (1-2 sentences per response max). Never output long paragraphs.
2. Ask one simple question at a time.
3. Sound conversational, friendly, and helpful (British business tone).
4. If customer is busy or asks to call back later, ask what day and time works best, then invoke the `book_callback` tool.
5. If customer is interested in a quote/comparison, politely ask for their Business Name, Postcode, and if possible their MPAN / MPRN / Current Supplier or Contract End Date.
6. Once agreement/details are confirmed for comparison or contract switch, invoke the `register_sale` tool.
7. If customer wants to speak to a senior human manager or closer right now, invoke `transfer_to_agent`.
8. If customer is definitely not interested or asks not to be called, be courteous ("No problem at all, thank you for your time!") and invoke `mark_not_interested`.
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


import urllib.request
import urllib.error

@router.post("/converse")
def ai_converse(
    req: ConverseRequest,
    current_user: User = Depends(get_current_user),
):
    """Processes customer input with Groq and triggers CRM tool calling."""
    api_key = os.environ.get("GROQ_API_KEY", "") or GROQ_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server")

    system_prompt = req.customPitchPrompt or DEFAULT_ENERGY_PITCH
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
