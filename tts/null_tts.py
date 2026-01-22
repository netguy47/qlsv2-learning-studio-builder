from .base import TTSProvider

class NullTTS(TTSProvider):
    def synthesize(self, text: str, out_path: str) -> str:
        raise RuntimeError("TTS is not enabled. Configure a TTS provider.")
