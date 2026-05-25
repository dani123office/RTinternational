import uvicorn
import os
os.environ['COHERE_API_KEY'] = 'dummy'
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=7219, reload=False)
