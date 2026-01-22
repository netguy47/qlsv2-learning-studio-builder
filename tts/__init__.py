import os
import logging
from .gtts_provider import GTTSProvider
from .oneminai_provider import OneMinAIProvider

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_tts_provider():
    """Get TTS provider based on environment configuration with failsafe"""
    tts_provider = os.getenv('TTS_PROVIDER', 'gtts').lower()
    
    if tts_provider == 'oneminai':
        try:
            provider = OneMinAIProvider()
            logger.info("Using 1min.ai TTS provider")
            return provider
        except Exception as e:
            logger.error(f"Failed to initialize 1min.ai provider: {str(e)}")
            logger.info("Falling back to GTTS provider")
            return GTTSProvider()
    else:
        # Default to gTTS
        logger.info("Using GTTS provider")
        return GTTSProvider()

def get_tts_provider_with_retry(max_retries=2):
    """Get TTS provider with retry mechanism for failsafe"""
    tts_provider = os.getenv('TTS_PROVIDER', 'gtts').lower()
    
    if tts_provider == 'oneminai':
        for attempt in range(max_retries + 1):
            try:
                provider = OneMinAIProvider()
                logger.info(f"Successfully initialized 1min.ai provider (attempt {attempt + 1})")
                return provider
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed to initialize 1min.ai provider: {str(e)}")
                if attempt < max_retries:
                    continue
                else:
                    logger.error("All attempts failed to initialize 1min.ai provider")
                    logger.info("Falling back to GTTS provider")
                    return GTTSProvider()
    else:
        logger.info("Using GTTS provider")
        return GTTSProvider()
