import cohere, os, json
from dotenv import load_dotenv
load_dotenv()
co = cohere.ClientV2(api_key=os.getenv('COHERE_API_KEY'))
try:
    response = co.chat(
        model='command-a-plus-05-2026',
        messages=[{'role':'user','content':'Return JSON: {"test": "hello"}'}],
        temperature=0.0,
        response_format={'type':'json_object'},
    )
    msg = response.message
    print(f'Role: {msg.role}')
    print(f'Content type: {type(msg.content)}')
    print(f'Content length: {len(msg.content)}')
    for i, item in enumerate(msg.content):
        print(f'  Item {i}: type={type(item).__name__}')
        print(f'  Item {i} dir: {[x for x in dir(item) if not x.startswith("_")]}')
        if hasattr(item, 'text'):
            print(f'  Item {i} text: {item.text[:200]}')
        elif hasattr(item, 'value'):
            print(f'  Item {i} value: {item.value[:200]}')
        else:
            print(f'  Item {i} full repr: {repr(item)[:500]}')
except Exception as e:
    print(f'ERROR: {type(e).__name__}: {e}')
    import traceback
    traceback.print_exc()
