# ArzEn Speech Intelligence Platform

A full-stack web application for **code-switched Egyptian Arabic–English** Automatic Speech Recognition (ASR) and Machine Translation (MT), built with a fine-tuned Whisper model and a quantized Llama-3 translation model served entirely locally.

---

## Project Structure

```
arzen-asr-mt/
├── backend/
│   ├── api.py               # FastAPI route definitions — REST + WebSocket endpoints
│   ├── config.py            # Model IDs, device config, inference constants
│   ├── inference.py         # run_asr() and run_mt() — model inference logic
│   ├── ml_models.py         # Lazy singleton loaders for Whisper and Llama
│   ├── main.py              # FastAPI app instantiation and startup
│   ├── utils.py             # Audio decoding (PyAV) and confidence scoring
│   └── requirements.txt
└── frontend/
    ├── public/
    │   ├── index.html
    │   ├── manifest.json
    │   ├── robots.txt
    │   └── gayar.png               # Tab logo
    ├── src/
    │   ├── index.jsx               # React entry point
    │   ├── index.css               # Global design tokens
    │   ├── App.jsx                 # Root component — state orchestration
    │   ├── App.css
    │   └── components/
    │       ├── Header.jsx / .css
    │       ├── InputPanel.jsx / .css       # Upload zone + mic button
    │       ├── RecordButton.jsx / .css     # MediaRecorder + WebSocket client
    │       ├── ResultsPanel.jsx / .css     # Audio player + export button
    │       ├── TranscriptPanel.jsx / .css  # ASR output + confidence highlights
    │       └── TranslationPanel.jsx / .css # MT output
    └── package.json
```

---

## Models

| Role | Model | Format | Size |
|---|---|---|---|
| ASR | [ahmedheakl/arazn-whisper-medium](https://huggingface.co/ahmedheakl/arazn-whisper-medium) | HuggingFace Transformers | ~1.5 GB |
| ASR Tokenizer | [openai/whisper-medium](https://huggingface.co/openai/whisper-medium) | HuggingFace Transformers | ~2 MB |
| MT | [ahmedheakl/arazn-llama3-english-gguf](https://huggingface.co/ahmedheakl/arazn-llama3-english-gguf) | GGUF Q4_K_M (llama.cpp) | ~4.9 GB |

> **Note:** Both models run **locally** — no API keys or internet connection required after the initial download. Models are cached at `C:\Users\<you>\.cache\huggingface\hub\`.

> **Note on tokenizer:** The fine-tuned Whisper checkpoint was saved with a broken tokenizer (vocab_size=0). The base `openai/whisper-medium` tokenizer is loaded instead — it is identical to what the model was trained with.

---

## Quick Start

### 1 — Backend

```bash
cd backend

python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

**GPU build for Llama (recommended — much faster):**
```bash
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
```
Replace `cu121` with your CUDA version. For CPU-only, skip this step.

```bash
uvicorn main:app --reload --port 8000
```

**Pre-load both models before serving requests (~6.4 GB total download on first run):**
```bash
curl -X POST http://localhost:8000/warmup
```
Poll `http://localhost:8000/health` — when both `asr_loaded` and `mt_loaded` are `true`, the app is ready.

---

### 2 — Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

Opens at `http://localhost:3000`. All `/transcribe` and `/ws/*` requests are proxied to the backend via the `"proxy"` field in `package.json`.

---

## Features

| Feature | How it works |
|---|---|
| **File upload** | Drag-and-drop or click → `POST /transcribe` → Whisper ASR + Llama MT |
| **Mic recording** | MediaRecorder streams binary chunks over WebSocket `/ws/stream` → incremental transcript updates |
| **Confidence highlighting** | Words with `confidence < 0.6` get an amber wavy underline; hover for exact score |
| **Side-by-side panels** | ASR (Egyptian Arabic, RTL) on the left; MT (English) on the right |
| **Audio playback** | Uploaded or recorded audio plays in an HTML5 `<audio>` element |
| **Export** | Downloads `transcript.txt` and `translation.txt` simultaneously |

---

## API Reference

### `POST /transcribe`
- **Body**: `multipart/form-data` with field `file` (WAV, MP3, OGG, WebM)
- **Response**: `{ job_id, filename, words: [{word, confidence}], translation, raw_text }`

### `WS /ws/stream`
Client sends:
- **Binary frames** — raw audio chunks from `MediaRecorder`
- **Text frame** — `{ type: "stop" }` when recording stops

Server emits:
- `{ type: "words", data: [{word, confidence}] }` — incremental transcript
- `{ type: "translation", data: "..." }` — MT result (sent on stop)
- `{ type: "done" }` — session complete

### `GET /health`
Returns `{ status, device, asr_loaded, mt_loaded }`

### `POST /warmup`
Triggers background loading of both models. Poll `/health` to track progress.
