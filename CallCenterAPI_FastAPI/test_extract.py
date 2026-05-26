"""Test the full AI extraction pipeline with realistic data."""
import cohere, os, json, re
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional, List

load_dotenv()
co = cohere.ClientV2(api_key=os.getenv('COHERE_API_KEY'))

# Test text
test_text = """Business: ACME Electronics
Address: 123 High Street, London
Owner: David Brown
Phone: 07700 900123
Email: david@acme.com
Electricity supply: 04 123 456 7890123456789
MPAN: 1234567890123
Current supplier: British Gas
Current rates: day 12.5p, night 8.2p, standing 28p
Offered prices: U.r 11.2p, N.r 7.1p, S.c 25p
Supplier: EDF Energy
24 months contract"""

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
    meterType: Optional[str] = 'Standard'

class OfferedRates(BaseModel):
    electricity: Optional[OfferedUtility] = None
    gas: Optional[OfferedUtility] = None

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

NUMERIC_FIELDS = {
    'dayUnitRate', 'nightUnitRate', 'eveningUnitRate', 'standingRate',
    'monthlyBill', 'unitRate', 'brokerServiceCharge',
}

def clean_numeric_values(obj, parent_key=''):
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

for attempt in range(2):
    print(f"\n--- Attempt {attempt+1} ---")
    try:
        response = co.chat(
            model='command-a-plus-05-2026',
            messages=[
                {'role': 'system', 'content': 'You extract UK energy data. Return ONLY valid JSON.'},
                {'role': 'user', 'content': f'Extract ALL data from this UK energy broker note. Return ONLY raw JSON.\n\n{test_text}'}
            ],
            temperature=0.0,
            response_format={'type': 'json_object'},
        )
        
        # Check content structure
        content = response.message.content
        print(f"content type: {type(content)}")
        print(f"content is None: {content is None}")
        
        if content is None:
            print("ERROR: content is None!")
            continue
            
        raw_text = next(
            item.text for item in content
            if hasattr(item, 'text')
        )
        print(f"Raw text ({len(raw_text)} chars): {raw_text[:200]}")
        
        data = json.loads(raw_text)
        print(f"Parsed data keys: {list(data.keys())}")
        
        data = clean_numeric_values(data)
        
        validated = ExtractionResponse(**data)
        result = validated.model_dump()
        print(f"businessName: {result['businessName']}")
        print("SUCCESS!")
        break
        
    except Exception as e:
        import traceback
        print(f"ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
