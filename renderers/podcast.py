from clients.pollinations import generate_text
from tts import get_tts_provider
from constants.errors import INSUFFICIENT_SOURCE_MESSAGE
import os
import uuid

MIN_WORDS = 800
MAX_CONTINUATIONS = 6
MODEL_FAILURE_PREFIX = "Model invocation failed."


def _word_count(text):
    return len([word for word in text.split() if word])


def _tail_text(text, max_words=120):
    words = [word for word in text.split() if word]
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[-max_words:])

def generate(baseline, generate_audio=False):
    prompt = f"""
You are an exploratory learning assistant.

CRITICAL CONSTRAINTS:
- You must use ONLY the source text provided below
- Do not rely on search results, external knowledge, or assumptions
- If the source text is insufficient to fulfill the request, say so explicitly and refuse to generate
- If sources conflict or differ, explore those differences without resolving them

Using ONLY the source material below, create a podcast dialogue between two hosts, Alex and Sam.
They are curious, reflective, and ask questions rather than making definitive statements.

Source material:
{baseline.content}

Requirements:
- 800+ words of dialogue
- Alex and Sam should question each other's interpretations
- Explore nuances and multiple perspectives
- End with open questions, not conclusions
- Use exploratory hedging: "The source suggests...", "One interpretation might be...", "This raises the question..."

Format strictly as:
Alex: [speech]
Sam: [speech]
"""
    script = generate_text(
        f"{prompt}\n\nCreate a podcast script of at least {MIN_WORDS} words. "
        "Use a conversational tone with an intro, main discussion, examples, and a closing section. "
        "Continue expanding until the minimum word count is reached.",
        temperature=0.5,
        max_tokens=2000
    )

    # Check if AI refused due to insufficient source
    if len(baseline.content.strip()) < 500 or "insufficient" in script.lower() or "not enough" in script.lower():
        return {"script": INSUFFICIENT_SOURCE_MESSAGE}
    if script.startswith(MODEL_FAILURE_PREFIX):
        return {"script": script}

    continuation_count = 0
    while _word_count(script) < MIN_WORDS and continuation_count < MAX_CONTINUATIONS:
        tail = _tail_text(script)
        continuation_prompt = (
            "Continue expanding the previous content. You have not yet reached the required "
            f"minimum word count of {MIN_WORDS}. Do not restart. Continue from where you left off.\n\n"
            f"Last section:\n{tail}"
        )
        continuation = generate_text(continuation_prompt, temperature=0.5, max_tokens=2000)
        if continuation.startswith(MODEL_FAILURE_PREFIX):
            break
        if not continuation.strip():
            break
        script = f"{script}\n\n{continuation.strip()}"
        continuation_count += 1

    result = {"script": script}
    
    if generate_audio:
        tts = get_tts_provider()
        audio_dir = "storage/audio"
        os.makedirs(audio_dir, exist_ok=True)
        audio_filename = f"podcast_{uuid.uuid4().hex[:8]}.mp3"
        audio_path = os.path.join(audio_dir, audio_filename)
        
        # Clean the script for TTS (remove "Alex:" and "Sam:" prefixes)
        clean_text = script.replace("Alex:", "").replace("Sam:", "").strip()
        
        tts.synthesize(clean_text, audio_path)
        result["audio_path"] = audio_path
    
    return result
