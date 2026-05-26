"""Test Gemini API integration."""
import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
print(f"API Key available: {bool(api_key)}")

genai.configure(api_key=api_key)

model = genai.GenerativeModel(
    "gemini-2.0-flash",
    generation_config={
        "response_mime_type": "application/json",
        "temperature": 0.0,
    }
)

resp = model.generate_content(
    'Return ONLY this JSON: {"test": "hello", "businessName": "ACME Corp"}'
)
print(f"Raw text: {resp.text[:300]}")
data = json.loads(resp.text)
print(f"Parsed: {data}")

# Test with full system prompt and realistic data
SYSTEM_PROMPT = "You are a utility data extraction assistant. Extract structured data from UK energy broker notes. Return ONLY valid JSON."

test_text = """Business: ACME Electronics
Address: 123 High Street, London
Owner: David Brown
Phone: 07700 900123
Electricity supply: 04 123 456 7890123456789
Current rates: day 12.5p, night 8.2p, standing 28p"""

resp2 = model.generate_content(
    f"{SYSTEM_PROMPT}\n\n"
    f"Extract ALL data from this UK energy broker note. Return ONLY raw JSON.\n\n"
    f"{test_text}"
)
print(f"\nRealistic test raw: {resp2.text[:500]}")
data2 = json.loads(resp2.text)
print(f"businessName: {data2.get('businessName')}")
print(f"utilityType: {data2.get('utilityType')}")
print(f"SUCCESS!")
