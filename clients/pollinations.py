import os
import requests
import urllib.parse

TEXT_ENDPOINT = "https://text.pollinations.ai"

def generate_text(prompt, temperature=0.4, max_tokens=800):
    """
    Generate text using Pollinations.ai text endpoint.
    This endpoint works without authentication for basic requests.
    """
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"{TEXT_ENDPOINT}/{encoded_prompt}"
    
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        return response.text.strip()
    except Exception as e:
        return (
            "Model invocation failed. Upstream text service is unavailable. "
            f"Details: {str(e)}"
        )


def generate_image(prompt, model="flux", width=1024, height=1024, use_auth=False):
    encoded = urllib.parse.quote(prompt)
    api_key = os.getenv("POLLINATIONS_API_KEY")
    if api_key and use_auth:
        encoded_key = urllib.parse.quote(api_key)
        return (
            f"https://gen.pollinations.ai/image/"
            f"{encoded}?model={model}&width={width}&height={height}&key={encoded_key}"
        )
    return (
        f"https://image.pollinations.ai/prompt/"
        f"{encoded}?model={model}&width={width}&height={height}"
    )
