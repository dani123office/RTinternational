import sys
import os

# Add the backend-api directory to sys.path so we can import CallCenterAPI_FastAPI as a package
backend_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

# Import the FastAPI app from the CallCenterAPI_FastAPI package
from CallCenterAPI_FastAPI.main import app

# Verify the app is properly initialized
if not hasattr(app, 'router'):
    raise RuntimeError("FastAPI app failed to initialize properly")

# Export the app for Vercel serverless function handler
__all__ = ['app']

