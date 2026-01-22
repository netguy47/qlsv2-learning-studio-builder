import requests
import os
from typing import Optional, List


class OneMinAIImageEnhancer:
    """1min.ai Image Enhancement using Image Variator and Image to Prompt"""
    
    def __init__(self):
        self.api_key = os.getenv('ONE_MIN_AI_API_KEY')
        self.unified_url = "https://api.1min.ai/api/features"
        self.image_to_prompt_url = "https://api.1min.ai/api/image-to-prompt"
        
        if not self.api_key:
            raise ValueError("ONE_MIN_AI_API_KEY environment variable is required")
    
    def generate_variations(
        self, 
        image_url: str, 
        num_variations: int = 3,
        output_dir: str = None
    ) -> List[str]:
        """
        Generate variations of an existing image
        
        Args:
            image_url: URL of the source image
            num_variations: Number of variations to generate (1-4)
            output_dir: Directory to save variations (optional)
            
        Returns:
            List of URLs to generated image variations
        """
        try:
            headers = {
                "API-KEY": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "type": "IMAGE_VARIATOR",
                "model": "magic-art",
                "promptObject": {
                    "imageUrl": image_url,
                    "mode": "fast",
                    "n": min(num_variations, 4),
                    "isNiji6": False,
                    "aspect_width": 1,
                    "aspect_height": 1,
                    "maintainModeration": True
                }
            }
            
            response = requests.post(
                self.unified_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract image URLs from response
            variations = []
            if 'images' in data:
                variations = data['images']
            elif 'imageUrls' in data:
                variations = data['imageUrls']
            elif 'data' in data:
                if isinstance(data['data'], list):
                    variations = data['data']
                elif isinstance(data['data'], dict) and 'url' in data['data']:
                    variations = [data['data']['url']]
            
            return variations
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"1min.ai Image Variator request failed: {str(e)}")
        except Exception as e:
            raise Exception(f"1min.ai Image Variator failed: {str(e)}")
    
    def image_to_prompt(self, image_url: str) -> str:
        """
        Convert an image to a descriptive prompt
        
        Args:
            image_url: URL of the source image
            
        Returns:
            Descriptive prompt for the image
        """
        try:
            headers = {
                "API-KEY": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "image_url": image_url,
                "detail_level": "high"
            }
            
            response = requests.post(
                self.image_to_prompt_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            return data.get('prompt', data.get('description', ''))
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"1min.ai Image to Prompt request failed: {str(e)}")
        except Exception as e:
            raise Exception(f"1min.ai Image to Prompt failed: {str(e)}")
    
    def enhance_image_prompt(self, original_prompt: str, image_url: Optional[str] = None) -> str:
        """
        Enhance an image generation prompt using AI
        
        Args:
            original_prompt: Original prompt
            image_url: Optional reference image URL
            
        Returns:
            Enhanced prompt
        """
        try:
            headers = {
                "API-KEY": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "type": "CHAT_WITH_AI",
                "model": "gpt-4o-mini",
                "promptObject": {
                    "prompt": f"Enhance this image generation prompt for better results: {original_prompt}",
                    "isMixed": False,
                    "webSearch": False
                }
            }
            
            if image_url:
                payload["promptObject"]["imageList"] = [image_url]
            
            response = requests.post(
                self.unified_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            return data.get('text', data.get('message', original_prompt))
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"1min.ai Image Enhancement request failed: {str(e)}")
        except Exception as e:
            raise Exception(f"1min.ai Image Enhancement failed: {str(e)}")
