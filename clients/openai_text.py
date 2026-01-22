"""
OpenAI Text Generation Client
Provides GPT-4 text generation as an alternative to Pollinations
"""

import os
import requests
import time


def generate_text(prompt: str, model: str = "gpt-4o-mini", temperature: float = 0.7, max_tokens: int = 2000) -> str:
    """
    Generate text using OpenAI API.

    Args:
        prompt: The prompt to send to the model
        model: Model to use (gpt-4o-mini, gpt-4, gpt-3.5-turbo)
        temperature: Sampling temperature (0.0-2.0)
        max_tokens: Maximum tokens to generate

    Returns:
        Generated text string

    Raises:
        Exception: If API key is missing or request fails
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise Exception("OPENAI_API_KEY environment variable not set")

    url = "https://api.openai.com/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that creates detailed, structured content."},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()

        data = response.json()

        if "choices" in data and len(data["choices"]) > 0:
            return data["choices"][0]["message"]["content"].strip()

        raise Exception("No content returned from OpenAI API")

    except requests.exceptions.Timeout:
        raise Exception("OpenAI API request timed out after 60 seconds")
    except requests.exceptions.RequestException as e:
        raise Exception(f"OpenAI API request failed: {str(e)}")


def generate_text_with_retry(prompt: str, model: str = "gpt-4o-mini", temperature: float = 0.7,
                             max_tokens: int = 2000, max_attempts: int = 3,
                             base_delay: float = 1.0) -> str:
    """
    Generate text with retry logic and exponential backoff.

    Args:
        prompt: The prompt to send
        model: Model to use
        temperature: Sampling temperature
        max_tokens: Maximum tokens
        max_attempts: Number of retry attempts
        base_delay: Initial delay between retries (seconds)

    Returns:
        Generated text string
    """
    last_exception = None

    for attempt in range(max_attempts):
        try:
            return generate_text(prompt, model, temperature, max_tokens)
        except Exception as e:
            last_exception = e

            if attempt < max_attempts - 1:
                delay = base_delay * (2 ** attempt)  # Exponential backoff
                print(f"[OpenAI] Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print(f"[OpenAI] All {max_attempts} attempts failed")

    raise last_exception
