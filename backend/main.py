"""
ASR & MT Backend — FastAPI + Uvicorn  v4.0
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import router

app = FastAPI(title="ASR & MT API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all the endpoints defined in api.py
app.include_router(router)