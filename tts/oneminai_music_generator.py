import requests
import os
from typing import Optional


class OneMinAIMusicGenerator:
    """1min.ai Music Generator"""
    
    def __init__(self):
        self.api_key = os.getenv('ONE_MIN_AI_API_KEY')
        self.base_url = "https://api.1min.ai/api/music"
        
        if not self.api_key:
            raise ValueError("ONE_MIN_AI_API_KEY environment variable is required")
    
    def generate_music(
        self, 
        prompt: str, 
        output_path: str, 
        model: str = "udio",
        duration: int = 30,
        style: Optional[str] = None
    ) -> str:
        """
        Generate background music using 1min.ai Music Generator
        
        Args:
            prompt: Text description of the music
            output_path: Path to save audio file
            model: Music model (udio, suno, musicgen, lyria)
            duration: Duration in seconds (default: 30)
            style: Music style (optional)
            
        Returns:
            Path to generated music file
        """
        try:
            headers = {
                "API-KEY": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "prompt": prompt,
                "duration": duration
            }
            
            if style:
                payload["style"] = style
            
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload,
                timeout=120
            )
            
            response.raise_for_status()
            
            # Check if response contains audio data
            if response.headers.get('content-type', '').startswith('audio/'):
                # Save music file
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                return output_path
            else:
                # Try to parse JSON response
                data = response.json()
                if 'audio' in data:
                    audio_data = data['audio']
                    if isinstance(audio_data, str):
                        # Download audio from URL
                        audio_response = requests.get(audio_data, timeout=60)
                        audio_response.raise_for_status()
                        with open(output_path, 'wb') as f:
                            f.write(audio_response.content)
                    else:
                        # Assume base64 or binary data
                        with open(output_path, 'wb') as f:
                            f.write(audio_data)
                    return output_path
                else:
                    raise Exception(f"No audio data in response: {data}")
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"1min.ai Music Generation request failed: {str(e)}")
        except Exception as e:
            raise Exception(f"1min.ai Music Generation failed: {str(e)}")
    
    def get_available_models(self) -> list:
        """Get available music generation models"""
        return [
            "udio",
            "suno",
            "musicgen",
            "lyria"
        ]
    
    def generate_podcast_background(self, output_path: str, duration: int = 30) -> str:
        """
        Generate background music suitable for podcasts
        
        Args:
            output_path: Path to save audio file
            duration: Duration in seconds
            
        Returns:
            Path to generated music file
        """
        prompt = "Calm, instrumental background music, soft piano, ambient, suitable for podcast narration"
        return self.generate_music(prompt, output_path, model="udio", duration=duration)
