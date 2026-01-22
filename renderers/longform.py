"""
Enhanced Longform Content Generator
Supports multiple AI providers with automatic fallback and continuation logic
"""

import os
import time
from clients.pollinations import generate_text as pollinations_generate
from clients.openai_text import generate_text_with_retry as openai_generate
from constants.errors import INSUFFICIENT_SOURCE_MESSAGE


MODEL_FAILURE_PREFIX = "Model invocation failed."


def _word_count(text: str) -> int:
    """Count words in text."""
    return len([word for word in text.split() if word])


def _tail_text(text: str, max_words: int = 120) -> str:
    """Extract last N words from text for continuation context."""
    words = [word for word in text.split() if word]
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[-max_words:])


def _sanitize(text: str) -> str:
    """Remove carriage returns and trim whitespace."""
    return text.replace("\r", "").strip()


def _generate_with_provider(prompt: str, provider: str, temperature: float = 0.7,
                            max_tokens: int = 2000) -> str:
    """
    Generate text using specified provider.

    Args:
        prompt: Text prompt
        provider: 'openai' or 'pollinations'
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate

    Returns:
        Generated text

    Raises:
        Exception: If generation fails
    """
    print(f"[LongForm] Using provider: {provider}")

    if provider == "openai":
        # Check if API key is available
        if not os.getenv("OPENAI_API_KEY"):
            raise Exception("OPENAI_API_KEY not set, cannot use OpenAI provider")

        return openai_generate(
            prompt,
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=temperature,
            max_tokens=max_tokens,
            max_attempts=3
        )
    else:  # pollinations
        return pollinations_generate(prompt, temperature=temperature, max_tokens=max_tokens)


def generate_longform(source_text: str, mode: str = "article", min_words: int = None,
                     provider: str = None, max_continuations: int = 8) -> str:
    """
    Generate long-form content (article or podcast) with continuation logic.

    Args:
        source_text: Source material to base content on
        mode: 'article' or 'podcast'
        min_words: Minimum word count (default: 1500 for article, 800 for podcast)
        provider: 'openai' or 'pollinations' (default: from env or 'pollinations')
        max_continuations: Maximum continuation attempts

    Returns:
        Generated long-form text

    Raises:
        Exception: If source is insufficient or generation fails
    """
    # Defaults
    if min_words is None:
        min_words = 1500 if mode == "article" else 800

    if provider is None:
        provider = os.getenv("LONGFORM_PROVIDER", "pollinations").strip().lower()

    # Validate source
    source = _sanitize(source_text)
    if not source or len(source) < 50:
        raise Exception("Source text missing or too short for generation (minimum 50 characters)")

    # Build system instructions
    if mode == "article":
        system_instructions = f"""You are an exploratory learning assistant.

CRITICAL CONSTRAINTS:
- You must use ONLY the source text provided below
- Do not rely on search results, external knowledge, or assumptions
- If the source text is insufficient to fulfill the request, say so explicitly and refuse to generate
- If sources conflict or differ, explore those differences without resolving them

Using ONLY the source material below, produce a neutral written report.
Do not assert truth. Do not persuade. Do not conclude definitively.

Source material:
{source}

End with open questions, not conclusions."""
    else:  # podcast
        system_instructions = f"""You are an exploratory learning assistant.

CRITICAL CONSTRAINTS:
- You must use ONLY the source text provided below
- Do not rely on search results, external knowledge, or assumptions
- If the source text is insufficient to fulfill the request, say so explicitly and refuse to generate
- If sources conflict or differ, explore those differences without resolving them

Using ONLY the source material below, create a podcast dialogue between two hosts, Alex and Sam.
They are curious, reflective, and ask questions rather than making definitive statements.

Source material:
{source}

Requirements:
- {min_words}+ words of dialogue
- Alex and Sam should question each other's interpretations
- Explore nuances and multiple perspectives
- End with open questions, not conclusions
- Use exploratory hedging: "The source suggests...", "One interpretation might be...", "This raises the question..."

Format strictly as:
Alex: [speech]
Sam: [speech]"""

    # Initial prompt
    initial_prompt = f"""{system_instructions}

Write a detailed, structured {mode} of at least {min_words} words. Include sections, examples, and transitions. Do not stop early. Continue writing until the minimum word count is reached."""

    print(f"[LongForm] Starting generation - Mode: {mode}, Min words: {min_words}, Provider: {provider}")
    print(f"[LongForm] Source length: {len(source)} chars")

    start_time = time.time()

    # Initial generation with fallback
    try:
        output = _generate_with_provider(initial_prompt, provider)
    except Exception as e:
        print(f"[LongForm] Primary provider '{provider}' failed: {e}")

        # Fallback to Pollinations if OpenAI fails
        if provider == "openai":
            print("[LongForm] Falling back to Pollinations...")
            try:
                output = _generate_with_provider(initial_prompt, "pollinations")
            except Exception as fallback_error:
                raise Exception(f"Both providers failed. OpenAI: {e}, Pollinations: {fallback_error}")
        else:
            raise

    # Check for refusal or empty output
    if not output or output.strip() == "":
        raise Exception("Initial generation returned empty output")

    if output.startswith(MODEL_FAILURE_PREFIX):
        raise Exception(output)

    if "insufficient" in output.lower() or "not enough" in output.lower():
        return INSUFFICIENT_SOURCE_MESSAGE

    initial_words = _word_count(output)
    print(f"[LongForm] Initial generation: {initial_words} words")

    # Continuation loop
    continuation_count = 0
    while _word_count(output) < min_words and continuation_count < max_continuations:
        continuation_count += 1
        current_words = _word_count(output)

        print(f"[LongForm] Continuation {continuation_count}/{max_continuations} - Current: {current_words}/{min_words} words")

        tail = _tail_text(output, max_words=200)
        continuation_prompt = f"""Continue expanding the previous content. You have produced {current_words} words so far and need to reach at least {min_words} words.

Do not restart. Continue from where you left off and expand until you reach the target word count.

Last section:
{tail}

Continue writing naturally from this point."""

        try:
            continuation = _generate_with_provider(continuation_prompt, provider, temperature=0.7, max_tokens=2000)
        except Exception as e:
            print(f"[LongForm] Continuation failed with {provider}: {e}")

            # Try fallback for continuation
            if provider == "openai":
                try:
                    continuation = _generate_with_provider(continuation_prompt, "pollinations")
                except:
                    print("[LongForm] Continuation fallback also failed, stopping")
                    break
            else:
                break

        # Check if continuation is valid
        if not continuation or continuation.strip() == "":
            print("[LongForm] Empty continuation, stopping")
            break

        if continuation.startswith(MODEL_FAILURE_PREFIX):
            print("[LongForm] Model failure in continuation, stopping")
            break

        # Append continuation
        output = f"{output}\n\n{continuation.strip()}"
        print(f"[LongForm] Added {_word_count(continuation)} words")

    final_words = _word_count(output)
    elapsed = time.time() - start_time

    print(f"[LongForm] Generation complete - Final: {final_words} words, Time: {elapsed:.1f}s, Continuations: {continuation_count}")

    if final_words < min_words:
        print(f"[LongForm] WARNING: Did not reach target word count ({final_words}/{min_words})")

    return output
