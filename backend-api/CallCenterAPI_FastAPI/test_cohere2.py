import cohere, os, json
from dotenv import load_dotenv
load_dotenv()
co = cohere.Client(os.getenv('COHERE_API_KEY'))
print(f'Sdk version: {cohere.__version__}')
# Check what params chat() accepts
import inspect
sig = inspect.signature(co.chat)
print(f'chat() params: {list(sig.parameters.keys())}')
