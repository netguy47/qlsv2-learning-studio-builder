from clients.pollinations import generate_text
from constants.errors import INSUFFICIENT_SOURCE_MESSAGE

MIN_WORDS = 1500
MAX_CONTINUATIONS = 6
MODEL_FAILURE_PREFIX = "Model invocation failed."


def _word_count(text):
    return len([word for word in text.split() if word])


def _tail_text(text, max_words=120):
    words = [word for word in text.split() if word]
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[-max_words:])

def generate(baseline):
    prompt = f"""
You are an exploratory learning assistant.

CRITICAL CONSTRAINTS:
- You must use ONLY the source text provided below
- Do not rely on search results, external knowledge, or assumptions
- If the source text is insufficient to fulfill the request, say so explicitly and refuse to generate
- If sources conflict or differ, explore those differences without resolving them

Using ONLY the source material below, produce a neutral written report.
Do not assert truth. Do not persuade. Do not conclude definitively.

Source material:
{baseline.content}

End with open questions, not conclusions.
"""
    result = generate_text(
        f"{prompt}\n\nWrite a detailed, structured article of at least {MIN_WORDS} words. "
        "Do not end early. Continue writing until the minimum word count is reached."
    )

    # Check if AI refused due to insufficient source
    if len(baseline.content.strip()) < 500 or "insufficient" in result.lower() or "not enough" in result.lower():
        return INSUFFICIENT_SOURCE_MESSAGE
    if result.startswith(MODEL_FAILURE_PREFIX):
        return result

    continuation_count = 0
    while _word_count(result) < MIN_WORDS and continuation_count < MAX_CONTINUATIONS:
        tail = _tail_text(result)
        continuation_prompt = (
            "Continue expanding the previous content. You have not yet reached the required "
            f"minimum word count of {MIN_WORDS}. Do not restart. Continue from where you left off.\n\n"
            f"Last section:\n{tail}"
        )
        continuation = generate_text(continuation_prompt)
        if continuation.startswith(MODEL_FAILURE_PREFIX):
            break
        if not continuation.strip():
            break
        result = f"{result}\n\n{continuation.strip()}"
        continuation_count += 1

    return result
