import torch
import numpy as np
from config import WHISPER_SR, DEVICE, DTYPE, MT_MAX_TOKENS, logger
from ml_models import get_asr, get_mt

def run_asr(audio: np.ndarray) -> str:
    processor, model = get_asr()
    inputs = processor(
        audio, sampling_rate=WHISPER_SR, return_tensors="pt",
    ).input_features.to(DEVICE).to(DTYPE)
    with torch.no_grad():
        ids = model.generate(
            inputs,
            forced_decoder_ids=model.generation_config.forced_decoder_ids,
        )
    return processor.batch_decode(ids, skip_special_tokens=True)[0].strip()

def run_mt(transcript: str) -> str:
    """Translate Egyptian Arabic / code-switched text → English"""
    if not transcript:
        return ""

    llm = get_mt()

    prompt = (
        "<|begin_of_text|>"
        "<|start_header_id|>system<|end_header_id|>\n\n"
        "You are a translation assistant. Translate the following Egyptian Arabic "
        "or code-switched Egyptian Arabic-English text into fluent English. "
        "Output only the English translation, nothing else."
        "<|eot_id|>"
        "<|start_header_id|>user<|end_header_id|>\n\n"
        f"{transcript}"
        "<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>\n\n"
    )

    response = llm(
        prompt,
        max_tokens=MT_MAX_TOKENS,
        temperature=0.1,
        stop=["<|eot_id|>", "<|end_of_text|>"],
        echo=False,
    )

    translation = response["choices"][0]["text"].strip()
    logger.info(f"MT: '{transcript}' → '{translation}'")
    return translation