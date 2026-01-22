import requests
import os
from typing import Optional
from .base import TTSProvider


class OneMinAIProvider(TTSProvider):
    """1min.ai ElevenLabs TTS Provider"""
    
    def __init__(self):
        self.api_key = os.getenv('ONE_MIN_AI_API_KEY')
        self.base_url = "https://api.1min.ai/api/features"
        
        if not self.api_key:
            raise ValueError("ONE_MIN_AI_API_KEY environment variable is required")
    
    def synthesize(self, text: str, output_path: str, voice: str = "Xb7hH8MSUJpSbSDYk0k2", speed: float = 1.0) -> str:
        """
        Synthesize text to speech using 1min.ai ElevenLabs API
        
        Args:
            text: Text to synthesize
            output_path: Path to save audio file
            voice: Voice ID (default: Xb7hH8MSUJpSbSDYk0k2)
            speed: Speech speed (0.25 to 4.0, default: 1.0)
            
        Returns:
            Path to generated audio file
        """
        try:
            headers = {
                "API-KEY": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "type": "TEXT_TO_SPEECH",
                "model": "elevenlabs-tts",
                "conversationId": "TEXT_TO_SPEECH",
                "promptObject": {
                    "text": text,
                    "voice_id": voice,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.5,
                        "style": 0,
                        "use_speaker_boost": True
                    },
                    "output_format": "mp3_44100_128",
                    "optimize_streaming_latency": 0,
                    "language_code": "en"
                }
            }
            
            response = requests.post(
                f"{self.base_url}?isStreaming=false",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            response.raise_for_status()
            
            # Parse JSON response
            data = response.json()
            
            # Check if request was successful
            # Status can be at top level or in aiRecord
            status = data.get('status') or data.get('aiRecord', {}).get('status')
            
            if status == 'SUCCESS':
                # Get audio URL from multiple possible locations
                # Prioritize temporaryUrl (authenticated URL) over resultObject (relative path)
                audio_url = None
                
                # Try aiRecord temporaryUrl first (most reliable)
                if 'aiRecord' in data:
                    ai_record = data['aiRecord']
                    if 'temporaryUrl' in ai_record:
                        audio_url = ai_record['temporaryUrl']
                
                # Try top level temporaryUrl
                if not audio_url:
                    audio_url = data.get('temporaryUrl')
                
                # Try resultObject at top level (relative path, less reliable)
                if not audio_url and 'resultObject' in data:
                    result_object = data['resultObject']
                    if isinstance(result_object, list) and len(result_object) > 0:
                        audio_url = result_object[0]
                    elif isinstance(result_object, dict) and 'url' in result_object:
                        audio_url = result_object['url']
                
                # Try aiRecordDetail
                if not audio_url and 'aiRecordDetail' in data:
                    ai_record_detail = data['aiRecordDetail']
                    if 'resultObject' in ai_record_detail:
                        result_object = ai_record_detail['resultObject']
                        if isinstance(result_object, list) and len(result_object) > 0:
                            audio_url = result_object[0]
                        elif isinstance(result_object, dict) and 'url' in result_object:
                            audio_url = result_object['url']
                
                if audio_url:
                    # Handle relative URLs
                    if not audio_url.startswith('http://') and not audio_url.startswith('https://'):
                        # Prepend base URL for relative paths
                        audio_url = f"https://asset.1min.ai/{audio_url}"
                    
                    # Download audio from URL
                    audio_response = requests.get(audio_url, timeout=60)
                    audio_response.raise_for_status()
                    with open(output_path, 'wb') as f:
                        f.write(audio_response.content)
                    return output_path
                else:
                    raise Exception(f"No audio URL found in response. Available keys: {list(data.keys())}")
            else:
                raise Exception(f"API request failed: {status or 'UNKNOWN'}")
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"1min.ai TTS request failed: {str(e)}")
        except Exception as e:
            raise Exception(f"1min.ai TTS synthesis failed: {str(e)}")
    
    def get_available_voices(self) -> list:
        """Get available voices from 1min.ai ElevenLabs"""
        # Common ElevenLabs voices available through 1min.ai
        return [
            "eleven_multilingual_v2",
            "eleven_turbo_v2",
            "eleven_monolingual_v1",
            "rachel",
            "drew",
            "clyde",
            "sarah",
            "adam",
            "fin"
        ]
