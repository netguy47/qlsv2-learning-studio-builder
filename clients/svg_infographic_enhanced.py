"""
Enhanced Infographic Generator
Creates data-driven, visually engaging infographics from content analysis
"""
import urllib.parse
import re
import base64
from typing import List, Dict, Optional
from clients.visual_theme import THEME, FONT_FAMILY


# Use same color palette as enhanced slides
COLORS = THEME


def escape_xml(text: str) -> str:
    """Escape XML special characters"""
    if not text:
        return ""
    return (str(text)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&apos;'))


def wrap_text(text: str, max_chars: int) -> List[str]:
    """Wrap text to fit within max_chars per line"""
    if not text:
        return []
    words = str(text).split()
    lines = []
    current_line = []
    current_length = 0

    for word in words:
        word_length = len(word) + (1 if current_line else 0)
        if current_length + word_length > max_chars and current_line:
            lines.append(' '.join(current_line))
            current_line = [word]
            current_length = len(word)
        else:
            current_line.append(word)
            current_length += word_length

    if current_line:
        lines.append(' '.join(current_line))

    return lines


def extract_statistics(data: Dict) -> List[Dict]:
    """Extract and format statistics from analysis data"""
    stats = data.get('statistics', [])
    if not stats:
        return []

    formatted = []
    for stat in stats[:4]:  # Max 4 stats
        if isinstance(stat, dict):
            formatted.append({
                'label': str(stat.get('label', ''))[:25],
                'value': str(stat.get('value', ''))[:15]
            })

    return formatted


def generate_enhanced_infographic(analysis: Dict, width: int = 1024, height: int = 1024) -> str:
    """
    Generate an enhanced infographic with visual elements

    analysis dict should contain:
    - title: str
    - key_facts: List[str]
    - statistics: List[dict] with 'label' and 'value'
    - themes: List[str]
    """

    title = analysis.get('title', 'Infographic')[:60]
    key_facts = analysis.get('key_facts', [])[:6]
    statistics = extract_statistics(analysis)
    themes = analysis.get('themes', [])[:4]

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">',
        # Background gradient
        f'''<defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:{COLORS['bg_primary']};stop-opacity:1" />
                <stop offset="55%" style="stop-color:{COLORS['bg_secondary']};stop-opacity:1" />
                <stop offset="100%" style="stop-color:#111c2f;stop-opacity:1" />
            </linearGradient>
            <radialGradient id="glow" cx="85%" cy="12%" r="45%">
                <stop offset="0%" style="stop-color:{COLORS['accent_primary']};stop-opacity:0.18" />
                <stop offset="100%" style="stop-color:{COLORS['bg_primary']};stop-opacity:0" />
            </radialGradient>
            <pattern id="dotGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="{COLORS['divider']}" opacity="0.35"/>
            </pattern>
        </defs>''',
        '<rect width="100%" height="100%" fill="url(#bgGradient)"/>',
        '<rect width="100%" height="100%" fill="url(#glow)"/>',
        '<rect width="100%" height="100%" fill="url(#dotGrid)" opacity="0.6"/>',
        f'<rect x="0" y="0" width="18" height="{height}" fill="{COLORS["accent_primary"]}" opacity="0.25"/>',
    ]

    template = _select_infographic_template(title, key_facts, statistics, themes)
    svg_parts.append(_render_infographic_title(title, width))

    if template == 'stat_focus' and statistics:
        svg_parts.append(_render_stat_focus_infographic(statistics, key_facts, width, height))
    elif template == 'comparison':
        svg_parts.append(_render_comparison_infographic(key_facts, width, height))
    elif template == 'timeline':
        svg_parts.append(_render_timeline_infographic(key_facts, width, height))
    elif template == 'process':
        svg_parts.append(_render_process_infographic(key_facts, width, height))
    else:
        current_y = 150
        if statistics:
            svg_parts.append(_render_statistics_section(statistics, width, current_y))
            current_y += 190
        if key_facts:
            svg_parts.append(_render_key_facts_section(key_facts, width, current_y, height))
            current_y += len(key_facts) * 100 + 80
        if themes and current_y < height - 100:
            svg_parts.append(_render_themes_footer(themes, width, height))

    svg_parts.append('</svg>')

    return '\n'.join(svg_parts)


def _render_infographic_title(title: str, width: int) -> str:
    """Render title with decorative elements"""
    title_text = escape_xml(title)

    return f'''
    <g>
        <!-- Decorative top bar -->
        <rect x="0" y="0" width="{width}" height="6" fill="{COLORS['accent_primary']}"/>

        <!-- Title background -->
        <rect x="40" y="26" width="{width-80}" height="92" rx="14"
              fill="{COLORS['bg_card']}" opacity="0.8" stroke="{COLORS['divider']}" stroke-width="1"/>

        <!-- Title text -->
        <text x="{width/2}" y="82" font-family="{FONT_FAMILY}" font-size="38"
              font-weight="bold" fill="{COLORS['text_primary']}" text-anchor="middle">
            {title_text}</text>

        <!-- Accent dots -->
        <circle cx="64" cy="72" r="6" fill="{COLORS['accent_primary']}"/>
        <circle cx="{width-64}" cy="72" r="6" fill="{COLORS['accent_secondary']}"/>
    </g>
    '''


def _render_statistics_section(statistics: List[Dict], width: int, start_y: int) -> str:
    """Render statistics as cards"""
    if not statistics:
        return ''

    svg_parts = []
    card_width = 220
    card_height = 130
    spacing = 24
    total_width = len(statistics) * card_width + (len(statistics) - 1) * spacing
    start_x = (width - total_width) / 2

    for i, stat in enumerate(statistics):
        x = start_x + i * (card_width + spacing)

        # Card background
        svg_parts.append(f'''<rect x="{x}" y="{start_y}" width="{card_width}" height="{card_height}"
            rx="14" fill="{COLORS['bg_card']}" stroke="{COLORS['divider']}" stroke-width="1"/>''')
        svg_parts.append(f'''<rect x="{x}" y="{start_y}" width="{card_width}" height="6"
            rx="14" fill="{COLORS['accent_primary']}"/>''')

        # Value (large number)
        value_text = escape_xml(stat['value'])
        svg_parts.append(f'''<text x="{x + card_width/2}" y="{start_y + 62}"
            font-family="{FONT_FAMILY}" font-size="44" font-weight="bold"
            fill="{COLORS['accent_primary']}" text-anchor="middle">
            {value_text}</text>''')

        # Label
        label_wrapped = wrap_text(stat['label'], 18)
        for j, line in enumerate(label_wrapped[:2]):
            label_y = start_y + 90 + j * 18
            svg_parts.append(f'''<text x="{x + card_width/2}" y="{label_y}"
                font-family="{FONT_FAMILY}" font-size="13" fill="{COLORS['text_secondary']}"
                text-anchor="middle">{escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_key_facts_section(key_facts: List[str], width: int, start_y: int, total_height: int) -> str:
    """Render key facts with visual hierarchy"""
    svg_parts = []

    # Section header
    svg_parts.append(f'''<text x="80" y="{start_y}" font-family="{FONT_FAMILY}" font-size="26"
        font-weight="bold" fill="{COLORS['accent_primary']}">Key Insights</text>''')

    # Divider line
    svg_parts.append(f'''<line x1="80" y1="{start_y + 10}" x2="250" y2="{start_y + 10}"
        stroke="{COLORS['accent_primary']}" stroke-width="2"/>''')

    # Facts
    fact_start_y = start_y + 44
    fact_height = 98

    for i, fact in enumerate(key_facts):
        y = fact_start_y + i * fact_height

        # Stop if we're running out of space
        if y + fact_height > total_height - 120:
            break

        # Card background
        svg_parts.append(f'''<rect x="60" y="{y}" width="{width - 120}" height="{fact_height - 10}"
            rx="14" fill="{COLORS['bg_card']}" opacity="0.85" stroke="{COLORS['divider']}" stroke-width="1"/>''')

        # Number circle
        svg_parts.append(f'''<circle cx="100" cy="{y + fact_height/2 - 5}" r="18"
            fill="{COLORS['accent_primary']}" opacity="0.25"/>''')
        svg_parts.append(f'''<text x="100" y="{y + fact_height/2 + 2}" font-family="{FONT_FAMILY}"
            font-size="18" font-weight="bold" fill="{COLORS['accent_primary']}" text-anchor="middle">
            {i + 1}</text>''')

        # Fact text with wrapping
        wrapped = wrap_text(fact, 80)
        for j, line in enumerate(wrapped[:3]):  # Max 3 lines per fact
            text_y = y + 32 + j * 22
            svg_parts.append(f'''<text x="140" y="{text_y}" font-family="{FONT_FAMILY}"
                font-size="16" fill="{COLORS['text_primary']}">
                {escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_themes_footer(themes: List[str], width: int, height: int) -> str:
    """Render themes as tags at the bottom"""
    svg_parts = []
    start_y = height - 80

    # Section label
    svg_parts.append(f'''<text x="80" y="{start_y}" font-family="{FONT_FAMILY}" font-size="14"
        fill="{COLORS['text_muted']}">TOPICS:</text>''')

    # Theme tags
    tag_x = 160
    tag_spacing = 20

    for theme in themes:
        theme_text = escape_xml(theme[:15])
        tag_width = len(theme_text) * 8 + 20

        # Tag background
        svg_parts.append(f'''<rect x="{tag_x}" y="{start_y - 16}" width="{tag_width}" height="22"
            rx="11" fill="{COLORS['accent_secondary']}" opacity="0.22"
            stroke="{COLORS['accent_secondary']}" stroke-width="1"/>''')

        # Tag text
        svg_parts.append(f'''<text x="{tag_x + tag_width/2}" y="{start_y}"
            font-family="{FONT_FAMILY}" font-size="12" fill="{COLORS['accent_secondary']}"
            text-anchor="middle">{theme_text}</text>''')

        tag_x += tag_width + tag_spacing

    return '\n'.join(svg_parts)


def _select_infographic_template(title: str, facts: List[str], stats: List[Dict], themes: List[str]) -> str:
    content = f"{title} " + " ".join(facts)
    lower = content.lower()
    if len(stats) >= 3:
        return 'stat_focus'
    if any(keyword in lower for keyword in ['vs', 'versus', 'before', 'after', 'compare', 'comparison']):
        return 'comparison'
    if any(keyword in lower for keyword in ['timeline', 'sequence', 'phase', 'stage', 'milestone', 'era']):
        return 'timeline'
    if any(keyword in lower for keyword in ['step', 'process', 'workflow', 'cycle', 'framework']):
        return 'process'
    return 'cards'


def _render_stat_focus_infographic(statistics: List[Dict], facts: List[str], width: int, height: int) -> str:
    svg_parts = []
    start_y = 170
    svg_parts.append(_render_statistics_section(statistics, width, start_y))
    subtitle_y = start_y + 160
    svg_parts.append(f'''<text x="80" y="{subtitle_y}" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['accent_secondary']}" font-weight="bold">Key Takeaways</text>''')
    fact_start = subtitle_y + 30
    for i, fact in enumerate(facts[:4]):
        y = fact_start + i * 70
        svg_parts.append(f'''<circle cx="100" cy="{y}" r="10" fill="{COLORS['accent_primary']}" opacity="0.5"/>''')
        wrapped = wrap_text(fact, 78)
        for j, line in enumerate(wrapped[:2]):
            svg_parts.append(f'''<text x="130" y="{y + j * 22}" font-family="{FONT_FAMILY}" font-size="16"
                fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')
    return '\n'.join(svg_parts)


def _render_comparison_infographic(facts: List[str], width: int, height: int) -> str:
    svg_parts = []
    mid_x = width / 2
    top = 170
    box_height = height - 260
    box_width = (width / 2) - 80

    svg_parts.append(f'''<rect x="50" y="{top}" width="{box_width}" height="{box_height}"
        rx="18" fill="{COLORS['bg_card']}" opacity="0.85" stroke="{COLORS['divider']}" stroke-width="1"/>''')
    svg_parts.append(f'''<rect x="{mid_x + 30}" y="{top}" width="{box_width}" height="{box_height}"
        rx="18" fill="{COLORS['bg_card']}" opacity="0.85" stroke="{COLORS['divider']}" stroke-width="1"/>''')

    svg_parts.append(f'''<text x="{mid_x / 2}" y="{top + 32}" font-family="{FONT_FAMILY}" font-size="20"
        fill="{COLORS['accent_primary']}" text-anchor="middle" font-weight="bold">Option A</text>''')
    svg_parts.append(f'''<text x="{mid_x + mid_x / 2}" y="{top + 32}" font-family="{FONT_FAMILY}" font-size="20"
        fill="{COLORS['accent_secondary']}" text-anchor="middle" font-weight="bold">Option B</text>''')

    split = max(1, len(facts) // 2)
    left = facts[:split]
    right = facts[split:]

    for i, fact in enumerate(left[:5]):
        y = top + 70 + i * 60
        wrapped = wrap_text(fact, 28)
        for j, line in enumerate(wrapped[:2]):
            svg_parts.append(f'''<text x="80" y="{y + j * 20}" font-family="{FONT_FAMILY}" font-size="15"
                fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    for i, fact in enumerate(right[:5]):
        y = top + 70 + i * 60
        wrapped = wrap_text(fact, 28)
        for j, line in enumerate(wrapped[:2]):
            svg_parts.append(f'''<text x="{mid_x + 60}" y="{y + j * 20}" font-family="{FONT_FAMILY}" font-size="15"
                fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_timeline_infographic(facts: List[str], width: int, height: int) -> str:
    svg_parts = []
    start_x = 120
    start_y = 180
    step_height = 100

    svg_parts.append(f'''<line x1="{start_x}" y1="{start_y}" x2="{start_x}" y2="{height - 120}"
        stroke="{COLORS['accent_primary']}" stroke-width="3" stroke-linecap="round"/>''')

    for i, fact in enumerate(facts[:6]):
        y = start_y + i * step_height
        svg_parts.append(f'''<circle cx="{start_x}" cy="{y}" r="14"
            fill="{COLORS['accent_primary']}" opacity="0.9"/>''')
        svg_parts.append(f'''<text x="{start_x}" y="{y + 5}" font-family="{FONT_FAMILY}" font-size="14"
            fill="{COLORS['bg_primary']}" text-anchor="middle" font-weight="bold">{i + 1}</text>''')
        wrapped = wrap_text(fact, 70)
        for j, line in enumerate(wrapped[:2]):
            svg_parts.append(f'''<text x="{start_x + 40}" y="{y + j * 22}"
                font-family="{FONT_FAMILY}" font-size="16" fill="{COLORS['text_primary']}">
                {escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_process_infographic(facts: List[str], width: int, height: int) -> str:
    svg_parts = []
    start_y = 220
    step_width = (width - 180) / 4
    step_count = min(4, max(1, len(facts)))

    for i in range(step_count):
        x = 60 + i * step_width
        svg_parts.append(f'''<rect x="{x}" y="{start_y}" width="{step_width - 30}" height="220"
            rx="18" fill="{COLORS['bg_card']}" opacity="0.85" stroke="{COLORS['divider']}" stroke-width="1"/>''')
        svg_parts.append(f'''<circle cx="{x + 24}" cy="{start_y + 30}" r="14"
            fill="{COLORS['accent_primary']}" opacity="0.9"/>''')
        svg_parts.append(f'''<text x="{x + 24}" y="{start_y + 35}" font-family="{FONT_FAMILY}" font-size="14"
            fill="{COLORS['bg_primary']}" text-anchor="middle" font-weight="bold">{i + 1}</text>''')
        fact = facts[i] if i < len(facts) else "Step detail"
        wrapped = wrap_text(fact, 20)
        for j, line in enumerate(wrapped[:5]):
            svg_parts.append(f'''<text x="{x + 20}" y="{start_y + 80 + j * 22}"
                font-family="{FONT_FAMILY}" font-size="14" fill="{COLORS['text_primary']}">
                {escape_xml(line)}</text>''')

        if i < step_count - 1:
            svg_parts.append(f'''<line x1="{x + step_width - 35}" y1="{start_y + 110}"
                x2="{x + step_width - 10}" y2="{start_y + 110}"
                stroke="{COLORS['accent_secondary']}" stroke-width="3" stroke-linecap="round"/>''')
            svg_parts.append(f'''<polygon points="{x + step_width - 10},{start_y + 110} {x + step_width - 20},{start_y + 104} {x + step_width - 20},{start_y + 116}"
                fill="{COLORS['accent_secondary']}"/>''')

    return '\n'.join(svg_parts)


def generate_infographic_data_url(analysis: Dict, width: int = 1024, height: int = 1024) -> str:
    """Generate enhanced infographic and return as base64 data URL"""
    svg = generate_enhanced_infographic(analysis, width, height)
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"
