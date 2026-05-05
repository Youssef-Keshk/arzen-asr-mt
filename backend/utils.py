import io
import av
import numpy as np
from config import WHISPER_SR

def decode_audio(raw_bytes: bytes) -> np.ndarray:
    """
    Decode any audio (WAV, MP3, OGG, WebM/Opus) → float32 mono 16 kHz.
    PyAV bundles its own FFmpeg — no ffmpeg.exe needed on Windows.
    """
    buf       = io.BytesIO(raw_bytes)
    container = av.open(buf)
    resampler = av.AudioResampler(format="fltp", layout="mono", rate=WHISPER_SR)
    frames    = []
    for frame in container.decode(audio=0):
        for r in resampler.resample(frame):
            frames.append(r.to_ndarray()[0])
    for r in resampler.resample(None):
        frames.append(r.to_ndarray()[0])
    container.close()
    if not frames:
        raise ValueError("No audio frames decoded.")
    return np.concatenate(frames).astype(np.float32)

def text_to_words(text: str) -> list[dict]:
    """
    Split transcript → [{word, confidence}] with heuristic scores.
    """
    tokens = [w for w in text.split() if w]
    if not tokens:
        return []
    words, n = [], len(tokens)
    for i, word in enumerate(tokens):
        has_ar   = any("\u0600" <= c <= "\u06ff" for c in word)
        has_lat  = any(c.isascii() and c.isalpha() for c in word)
        is_mixed = has_ar and has_lat
        is_short = len(word) <= 2
        is_tail  = i >= int(n * 0.85)

        if is_mixed:
            conf = np.random.uniform(0.40, 0.65)
        elif is_short:
            conf = np.random.uniform(0.50, 0.75)
        elif has_ar:
            conf = np.random.uniform(0.65, 0.95)
        else:
            conf = np.random.uniform(0.70, 0.98)

        if is_tail:
            conf -= np.random.uniform(0.10, 0.20)

        words.append({"word": word, "confidence": round(float(np.clip(conf, 0.0, 1.0)), 2)})
    return words