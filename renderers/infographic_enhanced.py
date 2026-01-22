"""
Enhanced Infographic Generator
Creates data-driven infographics that actually reflect the source content
"""

import os
import json
from clients.pollinations import generate_text, generate_image as generate_pollinations_image
from clients.openai_images import generate_image as generate_openai_image
from clients.svg_placeholder import generate_svg_data_url as generate_svg_placeholder
from clients.svg_infographic_enhanced import generate_infographic_data_url as generate_enhanced_svg_infographic
from constants.errors import INSUFFICIENT_SOURCE_MESSAGE

MIN_SOURCE_LEN = 500
MAX_KEYPOINT_CHARS = 500


def _analyze_content(content: str) -> dict:
    """
    Use AI to analyze content and extract structured data for infographic.
    Returns a dict with title, key_facts, statistics, themes.
    """
    analysis_prompt = f"""Analyze this content and extract structured data for an infographic.

Content to analyze:
{content[:1500]}

Return ONLY valid JSON (no markdown, no explanations) with this exact structure:
{{
  "title": "Short catchy title (5-8 words)",
  "key_facts": [
    "First key fact or finding",
    "Second key fact or finding",
    "Third key fact or finding",
    "Fourth key fact or finding"
  ],
  "statistics": [
    {{"label": "Metric name", "value": "Number or percentage"}},
    {{"label": "Another metric", "value": "Number or percentage"}}
  ],
  "themes": ["Theme 1", "Theme 2", "Theme 3"]
}}

Focus on concrete facts, numbers, and findings from the source material only."""

    try:
        response = generate_text(analysis_prompt, max_tokens=500)

        # Try to extract JSON from response
        # Sometimes AI adds markdown code blocks
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()

        data = json.loads(response)

        # Validate structure
        if not all(key in data for key in ['title', 'key_facts', 'statistics', 'themes']):
            raise ValueError("Missing required keys")

        return data
    except Exception as e:
        print(f"Content analysis failed: {e}")
        # Fallback: manual extraction
        sentences = content.split('. ')[:4]
        return {
            "title": "Key Insights",
            "key_facts": sentences,
            "statistics": [],
            "themes": ["Analysis", "Findings", "Insights"]
        }


def _create_visual_prompt(analysis: dict) -> str:
    """
    Create a visual description prompt for image generation.
    Focus on describing what the infographic should LOOK like, not instructions.
    """
    title = analysis['title']
    facts = analysis['key_facts'][:4]

    # Create visual description
    prompt = f"""A professional infographic poster with dark navy blue background (#0a192f).

Title at top in large white text: "{title}"

Four main sections arranged vertically, each with:
- Teal icon on left (#64ffda)
- White heading text
- Light gray body text (#ccd6f6)

Section content:
1. {facts[0] if len(facts) > 0 else 'Key Finding 1'}
2. {facts[1] if len(facts) > 1 else 'Key Finding 2'}
3. {facts[2] if len(facts) > 2 else 'Key Finding 3'}
4. {facts[3] if len(facts) > 3 else 'Key Finding 4'}

Clean, minimal, flat design style. No photos. No people. No decorative elements.
Professional business infographic layout with clear typography and hierarchy."""

    return prompt.strip()


def _create_svg_infographic(analysis: dict, width: int = 1024, height: int = 1024) -> str:
    """
    Create an SVG-based infographic with actual data from analysis.
    This ensures the data is ALWAYS displayed correctly.
    """
    title = analysis['title']
    facts = analysis['key_facts'][:6]
    stats = analysis['statistics'][:3]
    themes = analysis['themes'][:3]

    # Calculate section heights
    section_height = 140
    start_y = 120

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">',

        # Background
        '<rect width="100%" height="100%" fill="#0a192f"/>',

        # Title
        f'<text x="512" y="80" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#ccd6f6" text-anchor="middle">{_escape_xml(title)}</text>',

        # Decorative line under title
        '<line x1="256" y1="100" x2="768" y2="100" stroke="#64ffda" stroke-width="2"/>',
    ]

    # Add key facts
    for i, fact in enumerate(facts):
        y = start_y + (i * section_height)

        # Icon circle
        svg_parts.append(f'<circle cx="80" cy="{y}" r="20" fill="#64ffda" opacity="0.3"/>')
        svg_parts.append(f'<text x="80" y="{y + 7}" font-family="Arial" font-size="24" fill="#64ffda" text-anchor="middle" font-weight="bold">{i+1}</text>')

        # Fact text (word wrap)
        wrapped = _wrap_text(fact, 70)
        for j, line in enumerate(wrapped[:3]):  # Max 3 lines per fact
            text_y = y + (j * 24) - 10
            svg_parts.append(f'<text x="120" y="{text_y}" font-family="Arial" font-size="18" fill="#ccd6f6">{_escape_xml(line)}</text>')

    # Add statistics if available
    if stats:
        stats_y = start_y + (len(facts) * section_height) + 40
        svg_parts.append(f'<text x="512" y="{stats_y}" font-family="Arial" font-size="24" font-weight="bold" fill="#64ffda" text-anchor="middle">Key Statistics</text>')

        stat_x_positions = [200, 512, 824]
        for i, stat in enumerate(stats[:3]):
            x = stat_x_positions[i]
            y = stats_y + 60

            # Value
            svg_parts.append(f'<text x="{x}" y="{y}" font-family="Arial" font-size="32" font-weight="bold" fill="#64ffda" text-anchor="middle">{_escape_xml(stat["value"])}</text>')

            # Label
            label_wrapped = _wrap_text(stat['label'], 15)
            for j, line in enumerate(label_wrapped[:2]):
                label_y = y + 30 + (j * 20)
                svg_parts.append(f'<text x="{x}" y="{label_y}" font-family="Arial" font-size="14" fill="#8892b0" text-anchor="middle">{_escape_xml(line)}</text>')

    # Close SVG
    svg_parts.append('</svg>')

    svg_content = '\n'.join(svg_parts)

    # Return as data URL
    import base64
    encoded = base64.b64encode(svg_content.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _escape_xml(text: str) -> str:
    """Escape XML special characters."""
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&apos;'))


def _wrap_text(text: str, max_chars: int) -> list:
    """Wrap text to fit within max_chars per line."""
    words = text.split()
    lines = []
    current_line = []
    current_length = 0

    for word in words:
        word_length = len(word) + 1  # +1 for space
        if current_length + word_length > max_chars and current_line:
            lines.append(' '.join(current_line))
            current_line = [word]
            current_length = word_length
        else:
            current_line.append(word)
            current_length += word_length

    if current_line:
        lines.append(' '.join(current_line))

    return lines


def generate(baseline, should_hydrate=False):
    """
    Generate infographic with structured data.

    Modes (controlled by INFOGRAPHIC_MODE env var):
    - 'svg': Always use SVG (guaranteed to show data)
    - 'ai': Try AI image generation
    - 'hybrid': Try AI first, fallback to SVG

    Args:
        baseline: Content baseline object
        should_hydrate: If True, bypass MIN_SOURCE_LEN check (content is already hydrated)

    Returns:
        Image URL or data URL
    """
    content = (baseline.content or "").strip()
    if not should_hydrate and len(content) < MIN_SOURCE_LEN:
        return None

    print("[Infographic] Analyzing content...")
    analysis = _analyze_content(content)
    print(f"[Infographic] Extracted: {analysis['title']}")
    print(f"[Infographic] Key facts: {len(analysis['key_facts'])}")
    print(f"[Infographic] Statistics: {len(analysis['statistics'])}")

    visual_prompt = _create_visual_prompt(analysis)

    # Determine mode
    mode = (os.getenv("INFOGRAPHIC_MODE") or "svg").strip().lower()
    print(f"[Infographic] Mode: {mode}")

    # Mode: SVG only (guaranteed data display)
    if mode == "svg":
        print("[Infographic] Generating enhanced SVG infographic with visual elements...")
        return {
            "image_url": generate_enhanced_svg_infographic(analysis, width=1024, height=1024),
            "prompt": visual_prompt,
            "analysis": analysis
        }

    # Mode: AI or Hybrid
    if mode in ["ai", "hybrid"]:
        provider = (os.getenv("INFOGRAPHIC_IMAGE_PROVIDER") or "pollinations").strip().lower()
        print(f"[Infographic] Attempting AI image generation with {provider}...")
        try:
            if provider == "openai":
                result = generate_openai_image(visual_prompt, size="1024x1024")
                print(f"[Infographic] AI generation successful (OpenAI)")
                return {
                    "image_url": result,
                    "prompt": visual_prompt,
                    "analysis": analysis
                }
            else:
                result = generate_pollinations_image(visual_prompt, width=1024, height=1024)
                print(f"[Infographic] AI generation successful (Pollinations)")
                return {
                    "image_url": result,
                    "prompt": visual_prompt,
                    "analysis": analysis
                }
        except Exception as e:
            print(f"[Infographic] AI image generation failed: {e}")

            if mode == "hybrid":
                print("[Infographic] Falling back to enhanced SVG...")
                return {
                    "image_url": generate_enhanced_svg_infographic(analysis, width=1024, height=1024),
                    "prompt": visual_prompt,
                    "analysis": analysis
                }
            else:
                # AI mode failed, re-raise
                raise

    # Default: Generate enhanced SVG infographic
    print("[Infographic] Generating enhanced SVG infographic...")
    return {
        "image_url": generate_enhanced_svg_infographic(analysis, width=1024, height=1024),
        "prompt": visual_prompt,
        "analysis": analysis
    }
