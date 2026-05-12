from app.main import app

# For Vercel serverless
from fastapi.middleware.wsgi import WSGIMiddleware

# If needed, but for FastAPI, better to use ASGI
# But Vercel supports ASGI with api/index.py

# Actually, for Vercel, better to move to api/ directory
# But following user's instructions, create main.py here

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)