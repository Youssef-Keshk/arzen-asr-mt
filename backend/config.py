import logging
import torch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ASR
ASR_FINETUNED   = "ahmedheakl/arazn-whisper-medium"
ASR_BASE        = "openai/whisper-medium"      # correct tokenizer
WHISPER_SR      = 16_000
DEVICE          = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE           = torch.float16 if DEVICE == "cuda" else torch.float32

# MT — GGUF file inside the HuggingFace repo
MT_REPO_ID      = "ahmedheakl/arazn-llama3-english-gguf"
MT_FILENAME     = "arazn-llama3-english-gguf-unsloth.Q4_K_M.gguf"
MT_N_CTX        = 512          # context window
MT_MAX_TOKENS   = 256          # max tokens to generate
MT_N_GPU_LAYERS = -1 if DEVICE == "cuda" else 0   # -1 = offload all layers to GPU

# Streaming: run ASR every N chunks (~2 s at 500 ms/chunk)
INFERENCE_EVERY_N = 4