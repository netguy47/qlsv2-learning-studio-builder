from abc import ABC, abstractmethod

class TTSProvider(ABC):
    @abstractmethod
    def synthesize(self, text: str, out_path: str) -> str:
        """Generate an audio file and return the path."""
        raise NotImplementedError
