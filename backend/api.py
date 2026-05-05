import asyncio
import json
import threading
import uuid
from fastapi import APIRouter, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from config import INFERENCE_EVERY_N, WHISPER_SR, DEVICE, logger
from utils import decode_audio, text_to_words
from inference import run_asr, run_mt
from ml_models import get_asr, get_mt
import ml_models  # for checking if models are loaded in /health

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    raw_bytes = await file.read()

    try:
        audio = decode_audio(raw_bytes)
    except Exception as e:
        return JSONResponse(status_code=422, content={"error": f"Audio decode failed: {e}"})

    loop = asyncio.get_event_loop()

    try:
        text = await loop.run_in_executor(None, run_asr, audio)
    except Exception as e:
        logger.exception("ASR failed")
        return JSONResponse(status_code=500, content={"error": f"ASR failed: {e}"})

    logger.info(f"ASR transcript: '{text}'")
    words = text_to_words(text)

    try:
        translation = await loop.run_in_executor(None, run_mt, text)
    except Exception as e:
        logger.exception("MT failed")
        translation = "[MT error — see server logs]"

    return JSONResponse({
        "job_id":      str(uuid.uuid4()),
        "filename":    file.filename,
        "words":       words,
        "translation": translation,
        "raw_text":    text,
    })

@router.websocket("/ws/stream")
async def stream_asr(websocket: WebSocket):
    await websocket.accept()
    audio_buffer:    list[bytes] = []
    sent_word_count: int         = 0
    loop = asyncio.get_event_loop()

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.receive" and message.get("text"):
                try:
                    payload = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                if payload.get("type") == "stop":
                    all_words   = []
                    final_text  = ""

                    if audio_buffer:
                        try:
                            audio      = decode_audio(b"".join(audio_buffer))
                            final_text = await loop.run_in_executor(None, run_asr, audio)
                            all_words  = text_to_words(final_text)
                            diff       = all_words[sent_word_count:]
                            if diff:
                                await websocket.send_text(json.dumps({"type": "words", "data": diff}))
                        except Exception as e:
                            logger.warning(f"Final ASR pass failed: {e}")

                    try:
                        translation = await loop.run_in_executor(None, run_mt, final_text)
                    except Exception as e:
                        logger.warning(f"MT failed: {e}")
                        translation = "[MT error — see server logs]"

                    await websocket.send_text(json.dumps({"type": "translation", "data": translation}))
                    await websocket.send_text(json.dumps({"type": "done"}))
                    break

            elif message.get("type") == "websocket.receive" and message.get("bytes"):
                audio_buffer.append(message["bytes"])

                if len(audio_buffer) % INFERENCE_EVERY_N == 0:
                    try:
                        audio = decode_audio(b"".join(audio_buffer))
                        if len(audio) < WHISPER_SR * 1.0:
                            continue
                        text      = await loop.run_in_executor(None, run_asr, audio)
                        all_words = text_to_words(text)
                        diff      = all_words[sent_word_count:]
                        if diff:
                            sent_word_count += len(diff)
                            await websocket.send_text(json.dumps({"type": "words", "data": diff}))
                    except Exception as e:
                        logger.warning(f"Streaming ASR failed: {e}")

    except WebSocketDisconnect:
        logger.info("Client disconnected.")

@router.get("/health")
async def health():
    return {
        "status":          "ok",
        "device":          DEVICE,
        "asr_loaded":      ml_models._asr_model is not None,
        "mt_loaded":       ml_models._mt_model  is not None,
    }

@router.post("/warmup")
async def warmup():
    threading.Thread(target=get_asr, daemon=True).start()
    threading.Thread(target=get_mt,  daemon=True).start()
    return {"status": "loading both models"}