import os
import requests

OPENAI_IMAGES_ENDPOINT = "https://api.openai.com/v1/images/generations"


def generate_image(prompt, model="dall-e-3", size="1024x1024", quality="standard"):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing OPENAI_API_KEY for OpenAI image generation.")

    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "quality": quality,
        "n": 1,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    response = requests.post(OPENAI_IMAGES_ENDPOINT, json=payload, headers=headers, timeout=60)
    if not response.ok:
        raise RuntimeError(f"OpenAI image generation failed: {response.status_code} {response.text}")

    data = response.json()
    image_url = None
    if isinstance(data, dict) and data.get("data"):
        image_url = data["data"][0].get("url")
    if not image_url:
        raise RuntimeError("OpenAI image generation returned empty image URL.")
    return image_url
