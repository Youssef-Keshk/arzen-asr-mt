"""
ASR & MT Backend — FastAPI + Uvicorn  v4.0
"""

from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import router, warmup, health

async def wait_for_models_and_print_health():
    """Background task that polls health until models are loaded."""
    
    while True:
        current_health = await health()
        if current_health["asr_loaded"] and current_health["mt_loaded"]:
            print("\n" + "="*40)
            print(current_health)
            print("="*40 + "\n")
            break

        await asyncio.sleep(3)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Server starting: Invoking warmup...")

    await warmup()
    
    asyncio.create_task(wait_for_models_and_print_health())
    
    yield
    
    print("🛑 Server shutting down...")

app = FastAPI(title="ASR & MT API", version="4.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router)