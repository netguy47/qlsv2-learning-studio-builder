import os
import json
import re
import concurrent.futures
from clients.pollinations import generate_text, generate_image as generate_pollinations_image
from clients.openai_images import generate_image as generate_openai_image
from clients.svg_placeholder import generate_svg_data_url as generate_svg_placeholder
from clients.svg_enhanced import generate_svg_data_url
from constants.errors import INSUFFICIENT_SOURCE_MESSAGE

SLIDE_COUNT_DEFAULT = 6
SLIDE_COUNT_MAX = 100
MAX_WORKERS = int(os.getenv('MAX_CONCURRENT_IMAGE_GENERATION', 3))
FALLBACK_BULLET_COUNT = 4

def _build_fallback_slides(baseline, slide_count):
    """
    When LLM planning fails or returns empty, build simple placeholder slides
    from the baseline content so the UI always has something to render.
    """
    text = (baseline.content or "").strip()
    if not text:
        text = "Slide deck could not be generated from the provided content."

    # crude split into sentences and bullets
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
    if not sentences:
        sentences = [text]

    slides = []
    for i in range(slide_count):
        start = (i * FALLBACK_BULLET_COUNT) % max(len(sentences), 1)
        bullets = sentences[start:start + FALLBACK_BULLET_COUNT]
        if not bullets:
            bullets = sentences[:FALLBACK_BULLET_COUNT]
        slides.append({
            "title": f"Slide {i + 1}",
            "bullets": bullets[:FALLBACK_BULLET_COUNT],
            "notes": "",
            "image_prompt": ""
        })
    return slides

def _parse_existing_slide_blocks(text, slide_count=SLIDE_COUNT_DEFAULT):
    """
    If input already has 'Slide <n>' chunks, split them into structured slides.
    """
    blocks = [
        t.strip() for t in re.split(r"(?i)slide\s+\d+\s*", text) if t.strip()
    ]
    slides = []
    for i, block in enumerate(blocks[:slide_count]):
        # crude split into lines
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        title = lines[0][:120] if lines else f"Slide {i+1}"
        bullets = lines[1:6] if len(lines) > 1 else lines[:6]
        slides.append({
            "title": title,
            "bullets": bullets,
            "notes": "",
            "image_prompt": ""
        })
    return slides

def _extract_slide_plan(baseline, slide_count=SLIDE_COUNT_DEFAULT):
    """
    Returns a compact JSON-like plan as text (we keep it simple and robust).
    """
    # Check for insufficient source before generating
    if len(baseline.content.strip()) < 500:
        return INSUFFICIENT_SOURCE_MESSAGE

    # If content already has "Slide N" markers, parse locally and return JSON
    if re.search(r"(?i)slide\s+\d+", baseline.content):
        slides = _parse_existing_slide_blocks(baseline.content, slide_count)
        return json.dumps({"slides": slides})

    prompt = f"""
You are an expert slide planner. Return ONLY valid JSON, nothing else.
Schema: {{"slides":[{{"title":string,"bullets":array,"image_prompt":string,"notes":string}}]}}
Rules:
- Exactly {slide_count} slides.
- Use ONLY the source text. No external facts. If uncertain, keep it minimal.
- Each slide: short title; 3-5 concise bullets; presenter notes (1-2 sentences) grounded in source; image_prompt that matches the bullets.
- NO markdown, no prose, just JSON.

Source:
{baseline.content}
"""
    return generate_text(prompt, temperature=0.2, max_tokens=1200)

def _parse_slide_plan(plan_text):
    """
    Parse JSON slide plan; return list of slides with required keys.
    """
    if not plan_text:
        return []
    try:
        plan = json.loads(plan_text)
        slides = plan.get("slides", [])
        normalized = []
        for idx, slide in enumerate(slides):
            title = (slide.get("title") or f"Slide {idx+1}").strip()
            bullets = slide.get("bullets") or []
            notes = slide.get("notes") or ""
            image_prompt = slide.get("image_prompt") or ""
            # ensure bullets is list of strings
            bullets = [str(b).strip() for b in bullets if str(b).strip()]
            normalized.append({
                "title": title,
                "bullets": bullets[:6],
                "notes": notes,
                "image_prompt": image_prompt
            })
        return normalized
    except Exception:
        return []

def _build_image_prompt(slide):
    title = slide.get("title") or ""
    bullets = slide.get("bullets") or []
    bullet_text = "; ".join([str(b).strip() for b in bullets if str(b).strip()])
    return (
        f"Slide for presentation. Title: {title}. Key points: {bullet_text}. "
        "Visual style: clean, modern, minimal, navy background, teal accents, light text, no people, no photos, flat design."
    ).strip()

def _slide_image_prompt(title, bullets):
    bullet_str = "\n".join([f"• {b}" for b in bullets])
    return f"""
Professional presentation slide, flat design, minimal, clean typography.

CRITICAL CONSTRAINTS:
- You must use ONLY the content provided below (title and bullets)
- Do not add external information, illustrations, or assumptions
- If the content is insufficient to create a meaningful slide, create a minimal placeholder slide

Theme:
- deep navy background
- teal accents
- light gray text
- modern layout
- subtle dividers
- no photos, no people, no illustrations

Slide content (must be readable):
TITLE: {title}
BULLETS:
{bullet_str}

Style notes:
- strong hierarchy
- generous spacing
- crisp text
- infographic-like clarity
"""

def _generate_single_slide_image(slide, provider, image_model):
    """
    Generate image for a single slide with fallback chain.
    Uses enhanced SVG with auto-detection of slide type for better visuals.
    """
    if provider in ("svg", "none", "placeholder"):
        # Use enhanced SVG with auto-detection
        return generate_svg_data_url(slide["title"], slide["bullets"],
                                    width=1280, height=720, slide_type='auto')

    prompt = slide.get("image_prompt") or _slide_image_prompt(slide["title"], slide["bullets"])

    if provider == "openai":
        try:
            return generate_openai_image(prompt, size="1792x1024", quality="standard")
        except Exception as e:
            print(f"OpenAI image generation failed for slide '{slide['title']}': {e}")
            # Fall back to enhanced SVG
            return generate_svg_data_url(slide["title"], slide["bullets"],
                                        width=1280, height=720, slide_type='auto')

    try:
        return generate_pollinations_image(prompt, model=image_model, width=1280, height=720)
    except Exception as e:
        print(f"Pollinations image generation failed for slide '{slide['title']}': {e}")
        # Fall back to enhanced SVG
        return generate_svg_data_url(slide["title"], slide["bullets"],
                                    width=1280, height=720, slide_type='auto')

def generate(baseline, slide_count=SLIDE_COUNT_DEFAULT, image_model="flux"):
    """
    Returns a list of slide image URLs.
    Now with parallel image generation for improved performance.
    """
    # clamp slide_count to avoid runaway generation
    slide_count = max(1, min(slide_count, SLIDE_COUNT_MAX))
    plan = _extract_slide_plan(baseline, slide_count=slide_count)
    slides = _parse_slide_plan(plan) if isinstance(plan, str) else []

    # If planning failed or returned nothing, fall back to simple slides
    if not slides:
        slides = _build_fallback_slides(baseline, slide_count)
    # Ensure each slide has an image_prompt
    for slide in slides:
        if not slide.get("image_prompt"):
            slide["image_prompt"] = _build_image_prompt(slide)

    provider = (
        os.getenv("SLIDES_IMAGE_PROVIDER")
        or os.getenv("INFOGRAPHIC_IMAGE_PROVIDER")
        or "svg"
    ).strip().lower()
    target_slides = slides[:slide_count]

    # If provider is svg/none, generate enhanced SVG slides with auto-detection
    if provider in ("svg", "none", "placeholder"):
        urls = [
            generate_svg_data_url(slide["title"], slide["bullets"],
                                width=1280, height=720, slide_type='auto')
            for slide in target_slides
        ]
        return {
            "slide_plan": slides,
            "slide_image_urls": urls
        }

    # Enable parallel generation if environment flag is set
    enable_parallel = os.getenv('ENABLE_PARALLEL_GENERATION', 'true').lower() == 'true'

    if enable_parallel and len(target_slides) > 1:
        print(f"Generating {len(target_slides)} slides in parallel with {MAX_WORKERS} workers...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Use list() to preserve order of slides
            urls = list(executor.map(
                lambda slide: _generate_single_slide_image(slide, provider, image_model),
                target_slides
            ))
    else:
        print(f"Generating {len(target_slides)} slides sequentially...")
        urls = [_generate_single_slide_image(slide, provider, image_model) for slide in target_slides]

    return {
        "slide_plan": slides,
        "slide_image_urls": urls
    }
