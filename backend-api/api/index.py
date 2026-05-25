import sys
import os

root = os.path.dirname(os.path.dirname(__file__))
api_dir = os.path.join(root, 'CallCenterAPI_FastAPI')

sys.path.insert(0, root)
sys.path.insert(0, api_dir)

from main import app
