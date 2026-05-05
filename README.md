# VoiceBridge — ASR & MT Scaffolding

A fully functional UI and data pipeline for Automatic Speech Recognition (ASR)
and Machine Translation (MT). ML inference is abstracted behind mock async
functions — swap them out for real models when ready.

---

## Project Structure

```
asr-mt-app/
├── backend/
│   ├── main.py              # FastAPI app — REST upload + WebSocket streaming
│   └── requirements.txt
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── index.js         # React entry point
    │   ├── index.css        # Global tokens & reset
    │   ├── App.js           # Root component — state orchestration
    │   ├── App.css
    │   └── components/
    │       ├── Header.js / .css
    │       ├── InputPanel.js / .css     # Upload zone + mic button
    │       ├── RecordButton.js / .css   # MediaRecorder + WebSocket client
    │       ├── ResultsPanel.js / .css   # Audio player + export button
    │       ├── TranscriptPanel.js / .css # ASR output + confidence highlights
    │       └── TranslationPanel.js / .css # MT output
    └── package.json
```

---

## Quick Start

### 1 — Backend

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

---

### 2 — Frontend

Open a **new terminal tab**:

```bash
cd frontend
npm install
npm start
```

The React dev server starts at `http://localhost:3000` and proxies all
`/transcribe` and `/ws/*` requests to `http://localhost:8000` via the
`"proxy"` field in `package.json`.

---

## Features

| Feature | How it works |
|---|---|
| **File upload** | Drag-and-drop or click the upload zone → `POST /transcribe` → mock batch ASR + MT |
| **Mic recording** | Click the mic button → `MediaRecorder` streams binary chunks via WebSocket `/ws/stream` → mock streaming ASR emits words progressively |
| **Confidence highlighting** | Words with `confidence < 0.6` get an amber wavy underline; hover for exact score |
| **Side-by-side panels** | ASR (Egyptian Arabic, RTL) on the left; MT (English) on the right; both update simultaneously |
| **Audio playback** | Uploaded file or recorded audio plays in an HTML5 `<audio>` element |
| **Export** | "Export Results" downloads `transcript.txt` and `translation.txt` simultaneously |

---

## Replacing Mock Functions

All three mock functions live in `backend/main.py`:

```python
async def mock_batch_asr(audio_bytes: bytes) -> list[dict]: ...
async def mock_streaming_asr(chunk: bytes) -> list[dict] | None: ...
async def mock_translate(words: list[dict]) -> str: ...
```

Replace their bodies with real model calls (e.g. Whisper, SeamlessM4T, NLLB).
The rest of the pipeline — WebSocket lifecycle, REST endpoint, frontend rendering
— requires no changes.

---

## API Reference

### `POST /transcribe`
- **Body**: `multipart/form-data` with field `file` (audio file)
- **Response**: `{ job_id, filename, words: [{word, confidence}], translation }`

### `WS /ws/stream`
- Client sends binary audio blobs (from `MediaRecorder`)
- Server emits JSON messages:
  - `{ type: "words", data: [{word, confidence}] }` — incremental transcript
  - `{ type: "translation", data: "..." }` — final MT result (on disconnect)
  - `{ type: "done" }` — session complete
  - `{ type: "error", message: "..." }` — error

### `GET /health`
- Returns `{ status: "ok" }`
