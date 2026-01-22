import os
from clients.pollinations import generate_image as generate_pollinations_image
from clients.openai_images import generate_image as generate_openai_image
from clients.svg_placeholder import generate_svg_data_url
from constants.errors import INSUFFICIENT_SOURCE_MESSAGE

MIN_SOURCE_LEN = 500
MAX_PROMPT_LENGTH = 2000
MAX_KEYPOINT_CHARS = 500


def _extract_key_points(content: str, max_chars: int) -> str:
    cleaned = " ".join(content.split())
    if len(cleaned) <= max_chars:
        return cleaned
    sentences = []
    current = []
    for ch in cleaned:
        current.append(ch)
        if ch in ".!?":
            sentence = "".join(current).strip()
            if sentence:
                sentences.append(sentence)
            current = []
    if current:
        sentences.append("".join(current).strip())
    summary = ""
    for sentence in sentences:
        if len(summary) + len(sentence) + 1 > max_chars:
            break
        summary = f"{summary} {sentence}".strip()
    if not summary:
        summary = cleaned[:max_chars]
    return summary


def _infographic_prompt(content: str) -> str:
    """Build a strict prompt for the image generator using only the source content."""
    key_points = _extract_key_points(content, MAX_KEYPOINT_CHARS)
    return f"""
Create a clean, professional infographic.

CRITICAL CONSTRAINTS:
- You must use ONLY the source text provided below
- Do not rely on search results, external knowledge, or assumptions
- If the source text is insufficient to create a meaningful infographic, say so explicitly and refuse to generate
- If sources conflict or differ, explore those differences without resolving them

Style:
- Flat design
- Dark navy background
- Teal and light gray accents
- Minimal icons
- Clear typography
- No illustrations of people
- No artistic or abstract styles

Content rules:
- Only summarize what is present in the source
- Use short phrases and bullet points
- No opinions, no conclusions, no speculation

Structure:
- Title at top
- 4–6 key sections
- Simple visual hierarchy

Source material:
{key_points}
""".strip()


def generate(baseline):
    content = (baseline.content or "").strip()
    if len(content) < MIN_SOURCE_LEN:
        return None  # indicate insufficient source

    key_points = _extract_key_points(content, MAX_KEYPOINT_CHARS)
    prompt = _infographic_prompt(content)
    if len(prompt) > MAX_PROMPT_LENGTH:
        prompt = prompt[:MAX_PROMPT_LENGTH].rstrip() + "..."
    provider = (os.getenv("INFOGRAPHIC_IMAGE_PROVIDER") or "pollinations").strip().lower()
    if provider == "openai":
        try:
            return generate_openai_image(prompt)
        except Exception:
            try:
                return generate_pollinations_image(prompt)
            except Exception:
                lines = key_points.split(". ")
                return generate_svg_data_url("Infographic", lines)
    try:
        return generate_pollinations_image(prompt)
    except Exception:
        lines = key_points.split(". ")
        return generate_svg_data_url("Infographic", lines)
