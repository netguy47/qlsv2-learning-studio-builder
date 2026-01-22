from tts.base import TTSProvider
from gtts import gTTS
import os

class GTTSProvider(TTSProvider):
    def synthesize(self, text: str, out_path: str) -> str:
        """
        Generate audio using Google Text-to-Speech (gTTS).
        Free, no API key required.
        """
        tts = gTTS(text=text, lang='en', slow=False)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        
        tts.save(out_path)
        return out_path
