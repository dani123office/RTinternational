from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, List, Dict, Any
from openai import OpenAI
import json
import os
import logging
import re
import time
from dotenv import load_dotenv

from routers.auth import get_current_user
from models import User

load_dotenv()

# =========================================================
# LOGGING
# =========================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Extraction"]
)

# =========================================================
# ENVIRONMENT
# =========================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_AVAILABLE = bool(GROQ_API_KEY) and GROQ_API_KEY != "dummy"

if GROQ_AVAILABLE:
    groq_client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )
else:
    groq_client = None

# =========================================================
# SYSTEM PROMPT
# =========================================================

SYSTEM_PROMPT = """
You are a utility data extraction assistant.

Extract structured data from UK energy broker notes.

CRITICAL RULES:
- Output ONLY valid JSON
- No markdown
- No explanation
- No extra text
- No code blocks

FIELD NAME RULES:
- UR = dayUnitRate
- NR = nightUnitRate
- SC or CS = standingRate
- "lite" -> supplier = "British Gas Lite"
- "ced" = contractEndDate
- "service charges" = brokerServiceCharge
- "bill" = monthlyBill
- "Owner mobile:", "DM phone:", "Owner no:", "Direct:" = ownerPhone (owner ka personal number)
- "Business tel:", "Main line:", "Office:" = businessPhone (company ka number)

METER IDENTIFICATION:
- Supply numbers starting with "04" = electricity meter
- Supply numbers starting with "03" = gas meter
- MPAN = long number (13 digits) after the supply number
- If you see "s" before a supply number (e.g. "s 044..." or "s/044..."), ignore the "s" — it is a label, not part of the number
- Multiple meters = separate objects in the array

UTILITY RULES:
- Electricity rates use: dayUnitRate, nightUnitRate, eveningUnitRate, standingRate
- Gas rates use: unitRate, standingRate
- Current meter rates go into electricityMeters[] / gasMeters[]
- Offered rates go into offeredRates
- utilityType: "electricity" if day/night rates exist, "gas" if only unit rates exist

EXACT JSON STRUCTURE:

{
  "businessName": null,
  "businessAddress": null,
  "businessPhone": null,
  "postcode": null,
  "ownerName": null,
  "ownerPhone": null,
  "email": null,
  "utilityType": null,
  "notes": null,

  "electricityMeters": [
    {
      "supplyNumber": null,
      "mpan": null,
      "msn": null,
      "accountNumber": null,
      "currentSupplier": null,
      "dayUnitRate": null,
      "nightUnitRate": null,
      "eveningUnitRate": null,
      "standingRate": null,
      "monthlyBill": null,
      "contractEndDate": null
    }
  ],

  "gasMeters": [
    {
      "supplyNumber": null,
      "mprn": null,
      "msn": null,
      "accountNumber": null,
      "currentSupplier": null,
      "unitRate": null,
      "standingRate": null,
      "monthlyBill": null,
      "contractEndDate": null
    }
  ],

    "offeredRates": {
      "electricity": {
        "commission": { "dayUnitRate": null, "nightUnitRate": null, "eveningUnitRate": null, "standingRate": null },
        "nonCommission": { "dayUnitRate": null, "nightUnitRate": null, "eveningUnitRate": null, "standingRate": null },
        "contractLength": null,
        "supplier": null,
        "meterType": "Standard"
      },
      "gas": {
        "commission": { "dayUnitRate": null, "standingRate": null },
        "nonCommission": { "dayUnitRate": null, "standingRate": null },
        "contractLength": null,
        "supplier": null
      }
    },

  "brokerServiceCharge": null
}

OFFERED RATES PARSING:
- "U.r" or "U.r" after "Offered prices:" = offered dayUnitRate
- "E.v" after "Offered prices:" = offered eveningUnitRate  
- "N.r" after "Offered prices:" = offered nightUnitRate
- "S.c" after "Offered prices:" = offered standingRate
- If offered rates have no explicit commission label, put them in "commission" field by default
- "BG", "British Gas", "BG Plus" or similar before contract length = offered supplier
- "24 months", "3 years", "1 year" etc = contractLength
- If offered rates show commercial rates (no commission label) use "nonCommission" field

METER & ACCOUNT PARSING:
- "MSN:" or "Meter serial number:" followed by a code = msn field (both electricity and gas)
- "Account:" or "Account number:" or "A/C:" followed by digits = accountNumber field (both electricity and gas)
- MPAN format "S 04 043 D04 13 XXXX XXXX XXX": extract the 13-digit MPAN core (digits after distributor code, e.g. "1300009880970" from "S 04 043 D04 13 0000 9880 970"), put full supply ref in supplyNumber
- "MPAN:" followed by digits = mpan field (electricity only)
- "MPRN:" or "Meter point reference:" followed by digits = mprn field (gas only)
- "CED:" or "Contract end:" or "Contract end date:" followed by month/year = contractEndDate (convert to ISO format if possible)

IMPORTANT: commission and nonCommission rates MUST be objects with the fields shown above. Do not set them to null — omit them if absent.
"""

# =========================================================
# REQUEST MODEL
# =========================================================

class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)

# =========================================================
# RESPONSE MODELS
# =========================================================

class ElectricityRate(BaseModel):
    dayUnitRate: Optional[float] = None
    nightUnitRate: Optional[float] = None
    eveningUnitRate: Optional[float] = None
    standingRate: Optional[float] = None


class GasRate(BaseModel):
    unitRate: Optional[float] = None
    standingRate: Optional[float] = None


class Meter(BaseModel):
    currentSupplier: Optional[str] = None
    supplyNumber: Optional[str] = None
    mpan: Optional[str] = None
    mprn: Optional[str] = None
    msn: Optional[str] = None
    accountNumber: Optional[str] = None

    dayUnitRate: Optional[float] = None
    nightUnitRate: Optional[float] = None
    eveningUnitRate: Optional[float] = None
    standingRate: Optional[float] = None

    monthlyBill: Optional[float] = None
    contractEndDate: Optional[str] = None


class RateDetail(BaseModel):
    dayUnitRate: Optional[float] = None
    nightUnitRate: Optional[float] = None
    eveningUnitRate: Optional[float] = None
    unitRate: Optional[float] = None
    standingRate: Optional[float] = None


class OfferedUtility(BaseModel):
    commission: Optional[RateDetail] = None
    nonCommission: Optional[RateDetail] = None
    contractLength: Optional[str] = None
    supplier: Optional[str] = None
    meterType: Optional[str] = "Standard"


class OfferedRates(BaseModel):
    electricity: Optional[OfferedUtility] = None
    gas: Optional[OfferedUtility] = None


class ExtractionResponse(BaseModel):
    businessName: Optional[str] = None
    businessAddress: Optional[str] = None
    businessPhone: Optional[str] = None
    ownerPhone: Optional[str] = None
    postcode: Optional[str] = None
    ownerName: Optional[str] = None
    email: Optional[str] = None

    utilityType: Optional[str] = None
    notes: Optional[str] = None

    electricityMeters: List[Meter] = []
    gasMeters: List[Meter] = []

    offeredRates: Optional[OfferedRates] = None

    brokerServiceCharge: Optional[float] = None
    warnings: List[str] = []

# =========================================================
# HELPERS
# =========================================================

def clean_json_response(raw: str) -> str:
    """
    Remove markdown code blocks and clean response
    """

    raw = raw.strip()

    # Remove ```json
    raw = re.sub(r"^```json", "", raw)

    # Remove ```
    raw = re.sub(r"^```", "", raw)

    # Remove ending ```
    raw = re.sub(r"```$", "", raw)

    return raw.strip()


def extract_json(text: str) -> dict:
    """
    Extract and parse JSON safely
    """

    cleaned = clean_json_response(text)

    try:
        return json.loads(cleaned)

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        logger.error(f"Raw response: {cleaned[:1000]}")

        # Fallback to search first { and last }
        start_idx = cleaned.find('{')
        end_idx = cleaned.rfind('}')
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            try:
                return json.loads(cleaned[start_idx:end_idx+1])
            except json.JSONDecodeError:
                pass

        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse AI response: {str(e)}"
        )


NUMERIC_FIELDS = {
    'dayUnitRate', 'nightUnitRate', 'eveningUnitRate', 'standingRate',
    'monthlyBill', 'unitRate', 'brokerServiceCharge',
}


def clean_numeric_values(obj: Any, parent_key: str = '') -> Any:
    if isinstance(obj, dict):
        return {k: clean_numeric_values(v, k) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_numeric_values(v, parent_key) for v in obj]
    if isinstance(obj, str) and parent_key in NUMERIC_FIELDS:
        val = obj.strip()
        if not val or val.lower() in ('n/a', 'na', 'nil', 'null', '-', 'none', 'tbc', 'tbd'):
            return None
        m = re.search(r'(\d+\.?\d*)', val)
        if m:
            return float(m.group(1))
        return None
    return obj


def regex_fallback_extraction(text: str, error_msg: str) -> dict:
    """
    Fallback regex parser when AI extraction fails
    """
    logger.info("Executing regex fallback extraction")

    result = {
        "businessName": None,
        "businessAddress": None,
        "businessPhone": None,
        "ownerPhone": None,
        "postcode": None,
        "ownerName": None,
        "email": None,
        "utilityType": None,
        "notes": f"[AI OFFLINE: Basic fields extracted locally. Error: {error_msg}]",
        "electricityMeters": [],
        "gasMeters": [],
        "offeredRates": None,
        "brokerServiceCharge": None,
        "warnings": ["AI service offline. Using local pattern matching fallback."]
    }

    # 1. Postcode
    postcode_match = re.search(r'\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})\b', text, re.IGNORECASE)
    if postcode_match:
        result["postcode"] = postcode_match.group(1).upper()

    # 2. Email
    email_match = re.search(r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b', text)
    if email_match:
        result["email"] = email_match.group(1).lower()

    # 3. Phones — label-aware: prefer tagged numbers, then fallback to bare numbers
    biz_phone_match = re.search(r'(?:business\s*phone|business\s*tel|main\s*line|office)\s*:?\s*(\+?[\d\s\-\(\)]{7,20})', text, re.IGNORECASE)
    owner_phone_match = re.search(r'(?:owner\s*(?:mobile|phone|no)|dm\s*phone|direct)\s*:?\s*(\+?[\d\s\-\(\)]{7,20})', text, re.IGNORECASE)
    bare_phones = re.findall(r'\b(?:\+44|0)[\d\s\-]{9,13}\b', text)
    valid_bare = []
    for p in bare_phones:
        cleaned = re.sub(r'[\s\-]', '', p)
        if 9 <= len(cleaned) <= 12:
            valid_bare.append(p.strip())

    if biz_phone_match:
        result["businessPhone"] = biz_phone_match.group(1).strip()
    elif valid_bare:
        result["businessPhone"] = valid_bare[0]

    if owner_phone_match:
        result["ownerPhone"] = owner_phone_match.group(1).strip()
    elif len(valid_bare) > 1:
        result["ownerPhone"] = valid_bare[1]
    elif not result["businessPhone"] and valid_bare:
        result["businessPhone"] = valid_bare[0]

    # 4. Label-based field extraction
    biz_match = re.search(r'(?:business\s*name|company|business|client)\s*:\s*([^\n\r]+)', text, re.IGNORECASE)
    if biz_match:
        result["businessName"] = biz_match.group(1).strip()

    owner_match = re.search(r'\b(?:owner\s*name|owner|dm|contact\s*name|contact)\s*:\s*([^\n\r]+)', text, re.IGNORECASE)
    if not owner_match:
        owner_match = re.search(r'\b(?<!business\s)(?<!company\s)\bname\s*:\s*([^\n\r]+)', text, re.IGNORECASE)
    if owner_match:
        result["ownerName"] = owner_match.group(1).strip()

    addr_match = re.search(r'(?:address|site\s*address|supply\s*address)\s*:\s*([^\n\r]+)', text, re.IGNORECASE)
    if addr_match:
        result["businessAddress"] = addr_match.group(1).strip()

    # 5. Supply number / MPAN (electricity) / MPRN (gas)
    clean_text = re.sub(r'[-\s]', '', text)
    
    # Supply number pattern: 04-XXX-XXX or 04-XXX-XXX-XXXXX or similar
    supply_match = re.search(r'(?:supply\s*(?:number|ref)|supply)\s*:?\s*((?:04|03)[\s\-]+\d+[\s\-]+\d+(?:[\s\-]+\d+)*)', text, re.IGNORECASE)
    if not supply_match:
        supply_match = re.search(r'\b((?:04|03)[\s\-]+\d+[\s\-]+\d+(?:[\s\-]+\d+)*)\b', text)
    
    mpan_match = None
    if supply_match:
        raw = supply_match.group(1) if supply_match.lastindex else supply_match.group(0)
        cleaned = re.sub(r'[\s\-]', '', raw)
        digits_only = re.sub(r'[^\d]', '', raw)
        if cleaned.startswith('04') and len(digits_only) >= 13:
            result["utilityType"] = "electricity"
            supply = cleaned[:2] + '-' + cleaned[2:5] + '-' + cleaned[5:8] if len(cleaned) >= 8 else cleaned
            mpan = digits_only[:13] if len(digits_only) >= 13 else digits_only
            result["electricityMeters"].append({
                "currentSupplier": None, "supplyNumber": supply, "mpan": mpan if len(mpan) >= 13 else None,
                "mprn": None, "msn": None, "accountNumber": None,
                "dayUnitRate": None, "nightUnitRate": None, "eveningUnitRate": None,
                "standingRate": None, "monthlyBill": None, "contractEndDate": None
            })
        elif cleaned.startswith('03') and len(digits_only) >= 10:
            result["utilityType"] = "gas"
            supply = cleaned[:2] + '-' + cleaned[2:5] + '-' + cleaned[5:8] if len(cleaned) >= 8 else cleaned
            mprn = digits_only[:10] if len(digits_only) >= 10 else digits_only
            result["gasMeters"].append({
                "currentSupplier": None, "supplyNumber": supply,
                "mpan": None, "mprn": mprn if len(mprn) >= 10 else None,
                "msn": None, "accountNumber": None,
                "unitRate": None, "standingRate": None,
                "monthlyBill": None, "contractEndDate": None
            })
        else:
            result["electricityMeters"].append({
                "currentSupplier": None, "supplyNumber": cleaned,
                "mpan": None, "mprn": None, "msn": None, "accountNumber": None,
                "dayUnitRate": None, "nightUnitRate": None, "eveningUnitRate": None,
                "standingRate": None, "monthlyBill": None, "contractEndDate": None
            })
    
    if not supply_match:
        mpan_match = re.search(r'MPAN\s*:?\s*(\d{13})', text, re.IGNORECASE)
        if not mpan_match:
            mpan_match = re.search(r'\b(\d{13})\b', clean_text)
        if mpan_match:
            mpan = re.sub(r'[\s\-]', '', mpan_match.group(1) if mpan_match.lastindex else mpan_match.group(0))
            if len(mpan) >= 13:
                result["utilityType"] = "electricity"
                supply = f"04-{mpan[:3]}-{mpan[3:6]}" if len(mpan) >= 6 else None
                result["electricityMeters"].append({
                    "currentSupplier": None, "supplyNumber": supply, "mpan": mpan,
                    "mprn": None, "msn": None, "accountNumber": None,
                    "dayUnitRate": None, "nightUnitRate": None, "eveningUnitRate": None,
                    "standingRate": None, "monthlyBill": None, "contractEndDate": None
                })
    
    if not supply_match and not mpan_match:
        mprn_match = re.search(r'MPRN\s*:?\s*(\d{10})', text, re.IGNORECASE)
        if not mprn_match:
            mprn_match = re.search(r'\b(\d{10})\b', clean_text)
        if mprn_match:
            mprn = re.sub(r'[\s\-]', '', mprn_match.group(1) if mprn_match.lastindex else mprn_match.group(0))
            if len(mprn) >= 10:
                result["utilityType"] = "gas"
                supply = f"03-{mprn[:3]}-{mprn[3:6]}" if len(mprn) >= 6 else None
                result["gasMeters"].append({
                    "currentSupplier": None, "supplyNumber": supply,
                    "mpan": None, "mprn": mprn, "msn": None, "accountNumber": None,
                    "unitRate": None, "standingRate": None,
                    "monthlyBill": None, "contractEndDate": None
                })

    # 6. Utility type inference from text keywords
    if not result["utilityType"]:
        if re.search(r'\b(electricity|mpan|day\s*unit|night\s*unit|evening\s*unit|supply\s*04)\b', text, re.IGNORECASE):
            result["utilityType"] = "electricity"
        elif re.search(r'\b(gas|mprn|unit\s*rate|supply\s*03)\b', text, re.IGNORECASE):
            result["utilityType"] = "gas"

    # 7. MSN / serial number extraction on existing meters
    msn_match = re.search(r'(?:MSN|meter\s*serial|serial\s*no)\s*:?\s*([A-Za-z0-9\-]{4,20})', text, re.IGNORECASE)
    if msn_match:
        msn = msn_match.group(1).strip()
        for em in result["electricityMeters"]:
            em["msn"] = msn
        for gm in result["gasMeters"]:
            gm["msn"] = msn

    # 8. First line as fallback business name
    if not result["businessName"]:
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            first_line = lines[0]
            if len(first_line) < 50 and not any(lbl in first_line.lower() for lbl in ['note', 'broker', 'extract', 'call']):
                result["businessName"] = first_line

    return result


# =========================================================
# AI EXTRACTION
# =========================================================

MAX_RETRIES = 2


def generate_extraction(text: str) -> dict:
    if not GEMINI_AVAILABLE:
        logger.info("Gemini API key not available; using regex fallback")
        return regex_fallback_extraction(text, "Gemini API key not configured")

    last_error_msg = ""

    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"Extraction attempt {attempt + 1}/{MAX_RETRIES}")

            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            "Extract ALL data from this UK energy broker note. "
                            "Return ONLY raw JSON.\n\n"
                            f"{text}"
                        )
                    }
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
            )

            raw_text = response.choices[0].message.content
            if not raw_text:
                raise ValueError("Empty response from Groq")

            logger.info(f"AI response received. First 300 chars:\n{raw_text[:300]}")

            data = extract_json(raw_text)
            data = clean_numeric_values(data)

            validated = ExtractionResponse(**data)
            logger.info("Validation passed ✓")
            return validated.model_dump()

        except ValidationError as e:
            logger.warning(f"Pydantic validation error on attempt {attempt + 1}: {e}")
            last_error_msg = f"AI returned data that failed schema validation: {str(e)}"
            if attempt < MAX_RETRIES - 1:
                time.sleep(0.5)

        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {type(e).__name__}: {e}")
            last_error_msg = f"Extraction error: {type(e).__name__}: {e}"
            if attempt < MAX_RETRIES - 1:
                time.sleep(0.5)

    # Fallback to regex extraction if all attempts fail
    return regex_fallback_extraction(text, last_error_msg)

# =========================================================
# ROUTES
# =========================================================

@router.post(
    "/extract",
    response_model=ExtractionResponse
)
def extract_data(dto: ExtractRequest, current_user: User = Depends(get_current_user)):

    logger.info("Starting extraction request")

    if not dto.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )

    result = generate_extraction(dto.text)

    logger.info("Extraction completed successfully")

    return result
