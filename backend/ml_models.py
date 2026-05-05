import threading
# import torch
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
from transformers import WhisperForConditionalGeneration, WhisperProcessor

from config import (
    ASR_BASE, ASR_FINETUNED, DEVICE, DTYPE, 
    MT_REPO_ID, MT_FILENAME, MT_N_CTX, MT_N_GPU_LAYERS, logger
)

_asr_processor = None
_asr_model     = None
_asr_lock      = threading.Lock()

def get_asr():
    global _asr_processor, _asr_model
    if _asr_model is not None:
        return _asr_processor, _asr_model
    with _asr_lock:
        if _asr_model is not None:
            return _asr_processor, _asr_model
        logger.info(f"Loading ASR processor from '{ASR_BASE}' …")
        _asr_processor = WhisperProcessor.from_pretrained(ASR_BASE)
        logger.info(f"Loading ASR weights from '{ASR_FINETUNED}' …")
        _asr_model = WhisperForConditionalGeneration.from_pretrained(
            ASR_FINETUNED, torch_dtype=DTYPE,
        ).to(DEVICE)
        _asr_model.eval()
        # Force Arabic transcription
        _asr_model.generation_config.forced_decoder_ids = (
            _asr_processor.get_decoder_prompt_ids(language="arabic", task="transcribe")
        )
        _asr_model.generation_config.suppress_tokens = []
        logger.info("ASR model ready.")
    return _asr_processor, _asr_model

_mt_model  = None
_mt_lock   = threading.Lock()

def get_mt():
    global _mt_model
    if _mt_model is not None:
        return _mt_model
    with _mt_lock:
        if _mt_model is not None:
            return _mt_model

        logger.info(f"Downloading/locating MT GGUF from '{MT_REPO_ID}' …")
        gguf_path = hf_hub_download(
            repo_id=MT_REPO_ID,
            filename=MT_FILENAME,
        )
        logger.info(f"MT GGUF path: {gguf_path}")
        logger.info("Loading MT model into llama.cpp …")

        _mt_model = Llama(
            model_path=gguf_path,
            n_ctx=MT_N_CTX,
            n_gpu_layers=MT_N_GPU_LAYERS,
            verbose=False,           
        )
        logger.info("MT model ready.")
    return _mt_model