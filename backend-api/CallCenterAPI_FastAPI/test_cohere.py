import cohere, os, json
from dotenv import load_dotenv
load_dotenv()
co = cohere.Client(os.getenv('COHERE_API_KEY'))
try:
    response = co.chat(
        model='command-a-plus-05-2026',
        messages=[{'role':'user','content':'Say hello in JSON: {"greeting":"hello"}'}],
        temperature=0.0,
        response_format={'type':'json_object'},
    )
    print('SUCCESS:', response.message.content[0].text[:200])
except Exception as e:
    print(f'ERROR: {type(e).__name__}: {e}')
