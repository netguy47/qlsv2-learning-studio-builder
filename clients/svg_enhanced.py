"""
Enhanced SVG Generation - Level 2 Visual Improvements
Creates engaging, professional SVG slides with charts, icons, and better layouts
"""
import base64
import math
import re
from typing import List, Dict, Optional, Tuple
from clients.visual_theme import THEME, FONT_FAMILY


# ============================================================================
# COLOR PALETTE
# ============================================================================

COLORS = THEME


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

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


def extract_numbers(text: str) -> List[Tuple[str, str]]:
    """Extract numbers and their context from text"""
    # Pattern: number followed by optional unit/context
    pattern = r'(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?'
    matches = re.findall(pattern, text)

    results = []
    for num, unit in matches:
        # Skip single digits without context
        if len(num) == 1 and not unit:
            continue
        results.append((num, unit or ''))

    return results[:6]  # Max 6 stats


# ============================================================================
# ICON SYSTEM (Simple shapes and symbols)
# ============================================================================

def get_icon_svg(icon_type: str, x: float, y: float, size: float = 24, color: str = None) -> str:
    """Generate SVG for simple icons"""
    color = color or COLORS['accent_primary']
    half = size / 2

    icons = {
        'bullet': f'<circle cx="{x}" cy="{y}" r="{size/3}" fill="{color}" opacity="0.8"/>',

        'number_circle': f'<circle cx="{x}" cy="{y}" r="{half}" fill="none" stroke="{color}" stroke-width="2"/>',

        'check': f'''<g transform="translate({x-half},{y-half})">
            <circle cx="{half}" cy="{half}" r="{half}" fill="{COLORS['success']}" opacity="0.2"/>
            <path d="M {size*0.3} {size*0.5} L {size*0.45} {size*0.65} L {size*0.7} {size*0.35}"
                  stroke="{COLORS['success']}" stroke-width="2" fill="none" stroke-linecap="round"/>
        </g>''',

        'arrow_right': f'''<path d="M {x} {y-half*0.6} L {x+size*0.6} {y} L {x} {y+half*0.6}"
            stroke="{color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>''',

        'star': f'<polygon points="{x},{y-half} {x+half*0.3},{y-half*0.3} {x+half},{y} {x+half*0.3},{y+half*0.3} {x},{y+half} {x-half*0.3},{y+half*0.3} {x-half},{y} {x-half*0.3},{y-half*0.3}" fill="{color}" opacity="0.8"/>',

        'square': f'<rect x="{x-half*0.7}" y="{y-half*0.7}" width="{size*0.7}" height="{size*0.7}" fill="none" stroke="{color}" stroke-width="2" rx="2"/>',
    }

    return icons.get(icon_type, icons['bullet'])


# ============================================================================
# CHART GENERATION
# ============================================================================

def generate_bar_chart(data: List[Tuple[str, float]], x: float, y: float,
                       width: float = 400, height: float = 200) -> str:
    """Generate a simple bar chart"""
    if not data or len(data) == 0:
        return ''

    svg_parts = []
    max_value = max(value for _, value in data)
    bar_width = (width * 0.8) / len(data)
    spacing = width * 0.2 / (len(data) + 1)

    for i, (label, value) in enumerate(data[:6]):  # Max 6 bars
        bar_height = (value / max_value) * height * 0.7
        bar_x = x + spacing + i * (bar_width + spacing)
        bar_y = y + height - bar_height - 30

        # Bar
        svg_parts.append(f'''<rect x="{bar_x}" y="{bar_y}" width="{bar_width-10}" height="{bar_height}"
            fill="{COLORS['accent_primary']}" opacity="0.8" rx="2"/>''')

        # Value on top
        svg_parts.append(f'''<text x="{bar_x + bar_width/2 - 5}" y="{bar_y - 5}"
            font-family="{FONT_FAMILY}" font-size="12" fill="{COLORS['text_primary']}" text-anchor="middle">
            {int(value)}</text>''')

        # Label at bottom
        wrapped_label = wrap_text(label, 10)
        label_text = wrapped_label[0] if wrapped_label else label
        svg_parts.append(f'''<text x="{bar_x + bar_width/2 - 5}" y="{y + height - 10}"
            font-family="{FONT_FAMILY}" font-size="11" fill="{COLORS['text_secondary']}" text-anchor="middle">
            {escape_xml(label_text[:12])}</text>''')

    return '\n'.join(svg_parts)


def generate_progress_bar(label: str, percentage: float, x: float, y: float,
                          width: float = 300, height: float = 24) -> str:
    """Generate a progress bar"""
    percentage = max(0, min(100, percentage))
    fill_width = (percentage / 100) * width

    # Determine color based on percentage
    if percentage >= 75:
        fill_color = COLORS['success']
    elif percentage >= 40:
        fill_color = COLORS['accent_primary']
    else:
        fill_color = COLORS['warning']

    svg = f'''
    <g>
        <!-- Background -->
        <rect x="{x}" y="{y}" width="{width}" height="{height}"
              fill="{COLORS['bg_card']}" rx="4" stroke="{COLORS['divider']}" stroke-width="1"/>
        <!-- Fill -->
        <rect x="{x}" y="{y}" width="{fill_width}" height="{height}"
              fill="{fill_color}" opacity="0.8" rx="4"/>
        <!-- Label -->
        <text x="{x + width + 10}" y="{y + height/2 + 5}"
              font-family="{FONT_FAMILY}" font-size="13" fill="{COLORS['text_secondary']}">
            {escape_xml(label)}: {int(percentage)}%</text>
    </g>
    '''
    return svg


def generate_stat_card(value: str, label: str, x: float, y: float,
                       width: float = 120, height: float = 100) -> str:
    """Generate a stat card with large number"""
    svg = f'''
    <g>
        <!-- Card background -->
        <rect x="{x}" y="{y}" width="{width}" height="{height}"
              fill="{COLORS['bg_card']}" rx="8" stroke="{COLORS['divider']}" stroke-width="1"/>
        <rect x="{x}" y="{y}" width="{width}" height="6"
              fill="{COLORS['accent_primary']}" rx="8"/>
        <!-- Value -->
        <text x="{x + width/2}" y="{y + height/2 - 5}"
              font-family="{FONT_FAMILY}" font-size="34" font-weight="bold"
              fill="{COLORS['accent_primary']}" text-anchor="middle">
            {escape_xml(str(value)[:8])}</text>
        <!-- Label -->
        <text x="{x + width/2}" y="{y + height/2 + 25}"
              font-family="{FONT_FAMILY}" font-size="12"
              fill="{COLORS['text_secondary']}" text-anchor="middle">
            {escape_xml(label[:15])}</text>
    </g>
    '''
    return svg


def generate_timeline(items: List[str], x: float, y: float,
                      width: float = 500, height: float = 300) -> str:
    """Generate a vertical timeline"""
    if not items:
        return ''

    svg_parts = []
    item_height = min(height / len(items), 80)

    for i, item in enumerate(items[:6]):  # Max 6 items
        item_y = y + i * item_height

        # Timeline line
        if i < len(items) - 1:
            svg_parts.append(f'''<line x1="{x + 20}" y1="{item_y + 20}"
                x2="{x + 20}" y2="{item_y + item_height}"
                stroke="{COLORS['accent_primary']}" stroke-width="2"/>''')

        # Circle marker
        svg_parts.append(f'''<circle cx="{x + 20}" cy="{item_y + 20}" r="8"
            fill="{COLORS['accent_primary']}" stroke="{COLORS['bg_primary']}" stroke-width="2"/>''')

        # Item text
        wrapped = wrap_text(item, 50)
        for j, line in enumerate(wrapped[:2]):  # Max 2 lines per item
            svg_parts.append(f'''<text x="{x + 45}" y="{item_y + 25 + j*18}"
                font-family="{FONT_FAMILY}" font-size="14" fill="{COLORS['text_primary']}">
                {escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


# ============================================================================
# ENHANCED SLIDE GENERATOR
# ============================================================================

def generate_enhanced_slide(title: str, bullets: List[str],
                           width: int = 1280, height: int = 720,
                           slide_type: str = 'auto') -> str:
    """
    Generate an enhanced SVG slide with visual elements

    slide_type options:
    - 'auto': Detect best layout based on content
    - 'bullets': Standard bullet points with icons
    - 'stats': Stat cards for numerical data
    - 'progress': Progress bars
    - 'timeline': Timeline layout
    - 'comparison': Two-column comparison
    - 'hero_stat': Large single metric
    - 'question_answer': Question with highlighted answer
    - 'myth_reality': Two-panel myth vs reality
    - 'tension_relief': Problem vs response framing
    - 'debate_split': Pro/con debate framing
    - 'cause_effect': Cause vs effect framing
    - 'signal_action': Signal vs action framing
    - 'system_map': Nodes with linking lines
    """

    # Auto-detect slide type if needed
    if slide_type == 'auto':
        slide_type = _detect_slide_type(title, bullets)

    # Start SVG
    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">',
        f'''<defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="{COLORS['bg_primary']}"/>
                <stop offset="60%" stop-color="{COLORS['bg_secondary']}"/>
                <stop offset="100%" stop-color="#111c2f"/>
            </linearGradient>
            <radialGradient id="glow" cx="80%" cy="20%" r="45%">
                <stop offset="0%" stop-color="{COLORS['accent_primary']}" stop-opacity="0.18"/>
                <stop offset="100%" stop-color="{COLORS['bg_primary']}" stop-opacity="0"/>
            </radialGradient>
            <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="{COLORS['divider']}" stroke-width="1" opacity="0.22"/>
            </pattern>
        </defs>''',
        f'<rect width="100%" height="100%" fill="url(#bgGradient)"/>',
        f'<rect width="100%" height="100%" fill="url(#glow)"/>',
        f'<rect width="100%" height="100%" fill="url(#grid)" opacity="0.45"/>',
        f'<rect x="0" y="0" width="18" height="100%" fill="{COLORS["accent_primary"]}" opacity="0.25"/>',
    ]

    # Add title
    svg_parts.append(_render_title(title, width))

    # Render content based on type
    if slide_type == 'stats':
        svg_parts.append(_render_stats_layout(bullets, width, height))
    elif slide_type == 'hero_stat':
        svg_parts.append(_render_hero_stat_layout(title, bullets, width, height))
    elif slide_type == 'question_answer':
        svg_parts.append(_render_question_answer_layout(title, bullets, width, height))
    elif slide_type == 'myth_reality':
        svg_parts.append(_render_myth_reality_layout(bullets, width, height))
    elif slide_type == 'tension_relief':
        svg_parts.append(_render_tension_relief_layout(bullets, width, height))
    elif slide_type == 'debate_split':
        svg_parts.append(_render_debate_split_layout(bullets, width, height))
    elif slide_type == 'cause_effect':
        svg_parts.append(_render_cause_effect_layout(bullets, width, height))
    elif slide_type == 'signal_action':
        svg_parts.append(_render_signal_action_layout(bullets, width, height))
    elif slide_type == 'system_map':
        svg_parts.append(_render_system_map_layout(bullets, width, height))
    elif slide_type == 'progress':
        svg_parts.append(_render_progress_layout(bullets, width, height))
    elif slide_type == 'timeline':
        svg_parts.append(_render_timeline_layout(bullets, width, height))
    elif slide_type == 'comparison':
        svg_parts.append(_render_comparison_layout(bullets, width, height))
    else:  # bullets
        svg_parts.append(_render_bullets_layout(bullets, width, height))

    svg_parts.append('</svg>')

    return '\n'.join(svg_parts)


def _detect_slide_type(title: str, bullets: List[str]) -> str:
    """Detect the best slide type based on content"""
    content = (title + ' ' + ' '.join(bullets)).lower()
    keywords = content.replace('/', ' ')

    # Check for question/answer
    if '?' in title or any('?' in bullet for bullet in bullets):
        return 'question_answer'

    # Myth vs reality framing
    if any(word in keywords for word in ['myth', 'reality', 'fact', 'false', 'misconception', 'actually', 'truth']):
        return 'myth_reality'

    # Tension vs relief framing
    if any(word in keywords for word in ['risk', 'threat', 'tension', 'pressure', 'uncertainty', 'volatility', 'fear']) and any(
        word in keywords for word in ['relief', 'response', 'solution', 'stability', 'calm', 'containment', 'resolve']
    ):
        return 'tension_relief'

    # Debate split framing
    if any(word in keywords for word in ['pros', 'cons', 'for', 'against', 'debate', 'argument', 'counter', 'support', 'oppose']):
        return 'debate_split'

    if any(word in keywords for word in ['cause', 'because', 'drivers', 'trigger', 'led to', 'resulted']) and any(
        word in keywords for word in ['effect', 'impact', 'outcome', 'result', 'consequence']
    ):
        return 'cause_effect'

    if any(word in keywords for word in ['signal', 'indicator', 'warning', 'sign']) and any(
        word in keywords for word in ['action', 'response', 'move', 'decision']
    ):
        return 'signal_action'

    if any(word in keywords for word in ['system', 'ecosystem', 'network', 'interconnected', 'stakeholders', 'flows', 'supply chain']):
        return 'system_map'

    # Check for timeline indicators
    if any(word in content for word in ['timeline', 'sequence', 'steps', 'phases', 'stage']):
        return 'timeline'

    # Check for comparison indicators
    if any(word in content for word in ['vs', 'versus', 'before', 'after', 'comparison', 'compare']):
        return 'comparison'

    # Check for stats/numbers
    numbers = extract_numbers(content)
    if len(numbers) == 1 and len(bullets) <= 2:
        return 'hero_stat'
    if len(numbers) >= 3:
        return 'stats'

    # Check for progress indicators
    if any(word in content for word in ['progress', 'completion', 'status', '%', 'percent']):
        return 'progress'

    # Default to bullets
    return 'bullets'


def _render_hero_stat_layout(title: str, bullets: List[str], width: int, height: int) -> str:
    """Render a hero stat layout with a dominant number."""
    svg_parts = []
    numbers = extract_numbers(title + ' ' + ' '.join(bullets))
    value, unit = numbers[0] if numbers else ("1", "")
    context = bullets[0] if bullets else title
    context_lines = wrap_text(context, 48)

    svg_parts.append(f'''<circle cx="{width * 0.2}" cy="{height * 0.45}" r="140"
        fill="{COLORS['accent_primary']}" opacity="0.08"/>''')
    svg_parts.append(f'''<text x="{width * 0.2}" y="{height * 0.46}" font-family="{FONT_FAMILY}"
        font-size="120" font-weight="bold" fill="{COLORS['accent_primary']}" text-anchor="middle">
        {escape_xml(value)}</text>''')
    if unit:
        svg_parts.append(f'''<text x="{width * 0.2}" y="{height * 0.56}" font-family="{FONT_FAMILY}"
            font-size="32" font-weight="bold" fill="{COLORS['text_secondary']}" text-anchor="middle">
            {escape_xml(unit)}</text>''')

    x_start = width * 0.4
    y_start = height * 0.35
    for idx, line in enumerate(context_lines[:3]):
        svg_parts.append(f'''<text x="{x_start}" y="{y_start + idx * 36}" font-family="{FONT_FAMILY}"
            font-size="28" fill="{COLORS['text_primary']}" font-weight="bold">
            {escape_xml(line)}</text>''')

    if len(bullets) > 1:
        y_notes = y_start + 140
        wrapped = wrap_text(bullets[1], 56)
        for idx, line in enumerate(wrapped[:3]):
            svg_parts.append(f'''<text x="{x_start}" y="{y_notes + idx * 24}" font-family="{FONT_FAMILY}"
                font-size="18" fill="{COLORS['text_secondary']}">
                {escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_question_answer_layout(title: str, bullets: List[str], width: int, height: int) -> str:
    """Render a question with a highlighted answer block."""
    question = title if '?' in title else (bullets[0] if bullets else title)
    answer = bullets[1] if len(bullets) > 1 else (bullets[0] if bullets else "")
    answer_lines = wrap_text(answer, 38)

    svg_parts = []
    svg_parts.append(f'''<text x="{width/2}" y="220" font-family="{FONT_FAMILY}" font-size="32"
        fill="{COLORS['text_primary']}" text-anchor="middle" font-weight="bold">
        {escape_xml(question[:80])}</text>''')
    svg_parts.append(f'''<text x="{width/2}" y="260" font-family="{FONT_FAMILY}" font-size="18"
        fill="{COLORS['text_muted']}" text-anchor="middle">Question</text>''')

    box_width = 760
    box_height = 200
    box_x = (width - box_width) / 2
    box_y = 320
    svg_parts.append(f'''<rect x="{box_x}" y="{box_y}" width="{box_width}" height="{box_height}"
        rx="18" fill="{COLORS['bg_card']}" stroke="{COLORS['accent_primary']}" stroke-width="2"/>''')
    svg_parts.append(f'''<text x="{width/2}" y="{box_y + 50}" font-family="{FONT_FAMILY}" font-size="18"
        fill="{COLORS['text_secondary']}" text-anchor="middle" font-weight="bold">Answer</text>''')

    for idx, line in enumerate(answer_lines[:3]):
        svg_parts.append(f'''<text x="{width/2}" y="{box_y + 90 + idx * 30}" font-family="{FONT_FAMILY}"
            font-size="28" fill="{COLORS['accent_primary']}" text-anchor="middle" font-weight="bold">
            {escape_xml(line)}</text>''')

    if len(bullets) > 2:
        note_lines = wrap_text(' '.join(bullets[2:]), 80)
        for idx, line in enumerate(note_lines[:2]):
            svg_parts.append(f'''<text x="{width/2}" y="{box_y + box_height + 40 + idx * 24}"
                font-family="{FONT_FAMILY}" font-size="18" fill="{COLORS['text_secondary']}" text-anchor="middle">
                {escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_myth_reality_layout(bullets: List[str], width: int, height: int) -> str:
    """Render myth vs reality split with highlighted cards."""
    svg_parts = []
    mid_x = width / 2
    card_width = (width / 2) - 120
    card_height = 360
    top = 220

    svg_parts.append(f'''<rect x="80" y="{top}" width="{card_width}" height="{card_height}"
        rx="18" fill="{COLORS['bg_card']}" stroke="{COLORS['error']}" stroke-width="2"/>''')
    svg_parts.append(f'''<rect x="{mid_x + 40}" y="{top}" width="{card_width}" height="{card_height}"
        rx="18" fill="{COLORS['bg_card']}" stroke="{COLORS['accent_primary']}" stroke-width="2"/>''')

    svg_parts.append(f'''<text x="140" y="{top - 20}" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['error']}" font-weight="bold">Myth</text>''')
    svg_parts.append(f'''<text x="{mid_x + 100}" y="{top - 20}" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['accent_primary']}" font-weight="bold">Reality</text>''')

    left_text = bullets[0] if bullets else "Assumption that fails under scrutiny."
    right_text = bullets[1] if len(bullets) > 1 else "Evidence shows a more complex truth."
    left_lines = wrap_text(left_text, 38)
    right_lines = wrap_text(right_text, 38)

    for idx, line in enumerate(left_lines[:6]):
        svg_parts.append(f'''<text x="120" y="{top + 60 + idx * 28}" font-family="{FONT_FAMILY}"
            font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    for idx, line in enumerate(right_lines[:6]):
        svg_parts.append(f'''<text x="{mid_x + 80}" y="{top + 60 + idx * 28}" font-family="{FONT_FAMILY}"
            font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_tension_relief_layout(bullets: List[str], width: int, height: int) -> str:
    """Render tension vs relief with gradient split."""
    svg_parts = []
    svg_parts.append(f'''<rect x="80" y="200" width="{width - 160}" height="320"
        rx="20" fill="{COLORS['bg_secondary']}" opacity="0.7"/>''')
    svg_parts.append(f'''<rect x="80" y="200" width="{(width - 160) / 2}" height="320"
        rx="20" fill="{COLORS['error']}" opacity="0.12"/>''')
    svg_parts.append(f'''<rect x="{width / 2}" y="200" width="{(width - 160) / 2}" height="320"
        rx="20" fill="{COLORS['accent_primary']}" opacity="0.12"/>''')

    svg_parts.append(f'''<text x="140" y="240" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['error']}" font-weight="bold">Tension</text>''')
    svg_parts.append(f'''<text x="{width / 2 + 60}" y="240" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['accent_primary']}" font-weight="bold">Relief</text>''')

    left_text = bullets[0] if bullets else "Pressure is building without clarity."
    right_text = bullets[1] if len(bullets) > 1 else "Response restores stability."
    left_lines = wrap_text(left_text, 34)
    right_lines = wrap_text(right_text, 34)

    for idx, line in enumerate(left_lines[:6]):
        svg_parts.append(f'''<text x="120" y="{280 + idx * 26}" font-family="{FONT_FAMILY}"
            font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    for idx, line in enumerate(right_lines[:6]):
        svg_parts.append(f'''<text x="{width / 2 + 40}" y="{280 + idx * 26}" font-family="{FONT_FAMILY}"
            font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_debate_split_layout(bullets: List[str], width: int, height: int) -> str:
    """Render pro/con debate split with numbered points."""
    svg_parts = []
    mid_x = width / 2
    svg_parts.append(f'''<line x1="{mid_x}" y1="170" x2="{mid_x}" y2="{height - 100}"
        stroke="{COLORS['divider']}" stroke-width="2" stroke-dasharray="6,6"/>''')

    svg_parts.append(f'''<text x="{mid_x / 2}" y="200" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['accent_primary']}" font-weight="bold" text-anchor="middle">For</text>''')
    svg_parts.append(f'''<text x="{mid_x + mid_x / 2}" y="200" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['warning']}" font-weight="bold" text-anchor="middle">Against</text>''')

    mid_point = max(1, len(bullets) // 2)
    left_bullets = bullets[:mid_point]
    right_bullets = bullets[mid_point:]

    for i, bullet in enumerate(left_bullets[:4]):
        y = 250 + i * 70
        svg_parts.append(get_icon_svg('number_circle', 120, y, 24, COLORS['accent_primary']))
        svg_parts.append(f'''<text x="110" y="{y + 6}" font-family="{FONT_FAMILY}" font-size="14"
            fill="{COLORS['accent_primary']}" text-anchor="middle">{i + 1}</text>''')
        for j, line in enumerate(wrap_text(bullet, 32)[:2]):
            svg_parts.append(f'''<text x="150" y="{y + j * 22}" font-family="{FONT_FAMILY}"
                font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    for i, bullet in enumerate(right_bullets[:4]):
        y = 250 + i * 70
        svg_parts.append(get_icon_svg('number_circle', mid_x + 60, y, 24, COLORS['warning']))
        svg_parts.append(f'''<text x="{mid_x + 50}" y="{y + 6}" font-family="{FONT_FAMILY}" font-size="14"
            fill="{COLORS['warning']}" text-anchor="middle">{i + 1}</text>''')
        for j, line in enumerate(wrap_text(bullet, 32)[:2]):
            svg_parts.append(f'''<text x="{mid_x + 90}" y="{y + j * 22}" font-family="{FONT_FAMILY}"
                font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_cause_effect_layout(bullets: List[str], width: int, height: int) -> str:
    """Render cause vs effect framing."""
    svg_parts = []
    mid_x = width / 2
    box_width = (width / 2) - 120
    top = 210
    box_height = 360

    svg_parts.append(f'''<rect x="80" y="{top}" width="{box_width}" height="{box_height}"
        rx="18" fill="{COLORS['bg_card']}" stroke="{COLORS['warning']}" stroke-width="2"/>''')
    svg_parts.append(f'''<rect x="{mid_x + 40}" y="{top}" width="{box_width}" height="{box_height}"
        rx="18" fill="{COLORS['bg_card']}" stroke="{COLORS['accent_primary']}" stroke-width="2"/>''')

    svg_parts.append(f'''<text x="120" y="{top - 20}" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['warning']}" font-weight="bold">Cause</text>''')
    svg_parts.append(f'''<text x="{mid_x + 80}" y="{top - 20}" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['accent_primary']}" font-weight="bold">Effect</text>''')

    left_text = bullets[0] if bullets else "Root causes set the conditions."
    right_text = bullets[1] if len(bullets) > 1 else "The outcome changes the system."
    left_lines = wrap_text(left_text, 38)
    right_lines = wrap_text(right_text, 38)

    for idx, line in enumerate(left_lines[:6]):
        svg_parts.append(f'''<text x="120" y="{top + 60 + idx * 28}" font-family="{FONT_FAMILY}"
            font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    for idx, line in enumerate(right_lines[:6]):
        svg_parts.append(f'''<text x="{mid_x + 80}" y="{top + 60 + idx * 28}" font-family="{FONT_FAMILY}"
            font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_signal_action_layout(bullets: List[str], width: int, height: int) -> str:
    """Render signal vs action framing."""
    svg_parts = []
    mid_x = width / 2
    top = 210
    svg_parts.append(f'''<rect x="80" y="{top}" width="{width - 160}" height="360"
        rx="22" fill="{COLORS['bg_secondary']}" opacity="0.6"/>''')

    svg_parts.append(f'''<text x="140" y="{top - 20}" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['accent_primary']}" font-weight="bold">Signal</text>''')
    svg_parts.append(f'''<text x="{mid_x + 80}" y="{top - 20}" font-family="{FONT_FAMILY}" font-size="22"
        fill="{COLORS['accent_secondary']}" font-weight="bold">Action</text>''')

    left_text = bullets[0] if bullets else "A detectable warning or indicator."
    right_text = bullets[1] if len(bullets) > 1 else "The decisive response taken."
    left_lines = wrap_text(left_text, 34)
    right_lines = wrap_text(right_text, 34)

    for idx, line in enumerate(left_lines[:6]):
        svg_parts.append(f'''<text x="120" y="{top + 60 + idx * 26}" font-family="{FONT_FAMILY}"
            font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    for idx, line in enumerate(right_lines[:6]):
        svg_parts.append(f'''<text x="{mid_x + 80}" y="{top + 60 + idx * 26}" font-family="{FONT_FAMILY}"
            font-size="18" fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    svg_parts.append(f'''<line x1="{mid_x}" y1="{top + 40}" x2="{mid_x}" y2="{top + 330}"
        stroke="{COLORS['divider']}" stroke-width="2" stroke-dasharray="6,6"/>''')

    return '\n'.join(svg_parts)


def _render_system_map_layout(bullets: List[str], width: int, height: int) -> str:
    """Render a simple system map with connected nodes."""
    svg_parts = []
    nodes = [line.strip() for line in bullets if line.strip()]
    if not nodes:
        nodes = ["Core system", "Input", "Process", "Outcome", "Feedback"]
    nodes = nodes[:10]

    center_x = width / 2
    center_y = height / 2 + 40
    radius_outer = 250
    radius_inner = 150

    # Positions: center + orbiting nodes (inner + outer ring)
    positions = [(center_x, center_y)]
    orbit_nodes = nodes[1:]
    inner_count = min(4, len(orbit_nodes))
    outer_count = max(0, len(orbit_nodes) - inner_count)

    for i in range(inner_count):
        angle = (2 * math.pi * i) / max(inner_count, 1)
        x = center_x + radius_inner * math.cos(angle)
        y = center_y + radius_inner * 0.7 * math.sin(angle)
        positions.append((x, y))

    for i in range(outer_count):
        angle = (2 * math.pi * i) / max(outer_count, 1)
        x = center_x + radius_outer * math.cos(angle)
        y = center_y + radius_outer * 0.6 * math.sin(angle)
        positions.append((x, y))

    # Lines from center to others
    for idx in range(1, len(positions)):
        x, y = positions[idx]
        svg_parts.append(f'''<line x1="{center_x}" y1="{center_y}" x2="{x}" y2="{y}"
            stroke="{COLORS['divider']}" stroke-width="2" stroke-dasharray="6,6"/>''')

    # Nodes
    for idx, label in enumerate(nodes):
        x, y = positions[idx]
        is_center = idx == 0
        node_radius = 48 if is_center else 36
        fill = COLORS['accent_primary'] if is_center else COLORS['bg_card']
        stroke = COLORS['accent_primary'] if not is_center else COLORS['accent_secondary']
        text_color = COLORS['bg_primary'] if is_center else COLORS['text_primary']

        svg_parts.append(f'''<circle cx="{x}" cy="{y}" r="{node_radius}"
            fill="{fill}" stroke="{stroke}" stroke-width="2" opacity="0.95"/>''')

        wrapped = wrap_text(label, 14 if is_center else 12)
        for j, line in enumerate(wrapped[:2]):
            svg_parts.append(f'''<text x="{x}" y="{y + (j * 18) - 6}" font-family="{FONT_FAMILY}"
                font-size="14" fill="{text_color}" text-anchor="middle" font-weight="bold">
                {escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_title(title: str, width: int) -> str:
    """Render slide title with decoration"""
    title_text = escape_xml(title[:60])

    return f'''
    <g>
        <!-- Title band -->
        <rect x="{width * 0.12}" y="30" width="{width * 0.76}" height="78" rx="16"
              fill="{COLORS['bg_card']}" opacity="0.75" stroke="{COLORS['divider']}" stroke-width="1"/>
        <!-- Title -->
        <text x="{width/2}" y="82" font-family="{FONT_FAMILY}" font-size="44"
              font-weight="bold" fill="{COLORS['text_primary']}" text-anchor="middle">
            {title_text}</text>
        <!-- Decorative underline -->
        <line x1="{width/2 - 170}" y1="110" x2="{width/2 + 170}" y2="110"
              stroke="{COLORS['accent_primary']}" stroke-width="4" stroke-linecap="round"/>
    </g>
    '''


def _render_bullets_layout(bullets: List[str], width: int, height: int) -> str:
    """Render enhanced bullet point layout"""
    svg_parts = []
    start_y = 160
    line_height = 92

    for i, bullet in enumerate(bullets[:6]):
        y = start_y + (i * line_height)

        # Card background
        svg_parts.append(f'''<rect x="90" y="{y - 38}" width="{width - 180}" height="78"
            rx="14" fill="{COLORS['bg_card']}" opacity="0.85" stroke="{COLORS['divider']}" stroke-width="1"/>''')

        # Icon circle with number
        svg_parts.append(f'''<circle cx="120" cy="{y}" r="22"
            fill="{COLORS['accent_primary']}" opacity="0.25"/>''')
        svg_parts.append(f'''<text x="120" y="{y + 7}" font-family="{FONT_FAMILY}" font-size="20"
            fill="{COLORS['accent_primary']}" text-anchor="middle" font-weight="bold">
            {i + 1}</text>''')

        # Bullet text with wrapping
        wrapped = wrap_text(bullet, 70)
        for j, line in enumerate(wrapped[:2]):  # Max 2 lines per bullet
            text_y = y + (j * 26) - 6
            svg_parts.append(f'''<text x="170" y="{text_y}" font-family="{FONT_FAMILY}" font-size="20"
                fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


def _render_stats_layout(bullets: List[str], width: int, height: int) -> str:
    """Render stat cards layout"""
    # Extract numbers from bullets
    all_text = ' '.join(bullets)
    numbers = extract_numbers(all_text)

    if not numbers:
        # Fallback to bullets if no numbers found
        return _render_bullets_layout(bullets, width, height)

    svg_parts = []
    card_width = 180
    card_height = 120
    start_x = 100
    start_y = 180
    cols = 3

    for i, (value, unit) in enumerate(numbers[:6]):
        row = i // cols
        col = i % cols
        x = start_x + col * (card_width + 40)
        y = start_y + row * (card_height + 30)

        label = bullets[i] if i < len(bullets) else unit or 'Value'
        label = label[:20]  # Truncate long labels

        svg_parts.append(generate_stat_card(value + unit, label, x, y, card_width, card_height))

    return '\n'.join(svg_parts)


def _render_progress_layout(bullets: List[str], width: int, height: int) -> str:
    """Render progress bars layout"""
    svg_parts = []
    start_y = 180
    bar_height = 30
    spacing = 60
    bar_width = 600

    for i, bullet in enumerate(bullets[:6]):
        y = start_y + (i * spacing)

        # Try to extract percentage
        percentage_match = re.search(r'(\d+)%', bullet)
        if percentage_match:
            percentage = float(percentage_match.group(1))
            label = bullet.replace(percentage_match.group(0), '').strip()
        else:
            # Default to a visual percentage based on position
            percentage = 100 - (i * 15)
            label = bullet

        svg_parts.append(generate_progress_bar(label[:35], percentage, 120, y, bar_width, bar_height))

    return '\n'.join(svg_parts)


def _render_timeline_layout(bullets: List[str], width: int, height: int) -> str:
    """Render timeline layout"""
    return generate_timeline(bullets, 150, 180, width - 300, height - 250)


def _render_comparison_layout(bullets: List[str], width: int, height: int) -> str:
    """Render two-column comparison layout"""
    svg_parts = []
    mid_x = width / 2
    start_y = 180

    # Divider line
    svg_parts.append(f'''<line x1="{mid_x}" y1="140" x2="{mid_x}" y2="{height - 80}"
        stroke="{COLORS['divider']}" stroke-width="2" stroke-dasharray="5,5"/>''')

    # Column headers
    svg_parts.append(f'''<text x="{mid_x / 2}" y="150" font-family="{FONT_FAMILY}" font-size="24"
        fill="{COLORS['accent_primary']}" text-anchor="middle" font-weight="bold">
        Before / Option A</text>''')
    svg_parts.append(f'''<text x="{mid_x + mid_x / 2}" y="150" font-family="{FONT_FAMILY}" font-size="24"
        fill="{COLORS['accent_primary']}" text-anchor="middle" font-weight="bold">
        After / Option B</text>''')

    # Divide bullets into two columns
    mid_point = len(bullets) // 2
    left_bullets = bullets[:mid_point] or bullets
    right_bullets = bullets[mid_point:] or []

    # Left column
    for i, bullet in enumerate(left_bullets[:4]):
        y = start_y + (i * 70)
        svg_parts.append(get_icon_svg('bullet', 100, y, 16, COLORS['error']))
        wrapped = wrap_text(bullet, 35)
        for j, line in enumerate(wrapped[:2]):
            svg_parts.append(f'''<text x="130" y="{y + j*22 - 5}" font-family="{FONT_FAMILY}" font-size="18"
                fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    # Right column
    for i, bullet in enumerate(right_bullets[:4]):
        y = start_y + (i * 70)
        svg_parts.append(get_icon_svg('check', mid_x + 50, y, 20))
        wrapped = wrap_text(bullet, 35)
        for j, line in enumerate(wrapped[:2]):
            svg_parts.append(f'''<text x="{mid_x + 80}" y="{y + j*22 - 5}" font-family="{FONT_FAMILY}" font-size="18"
                fill="{COLORS['text_primary']}">{escape_xml(line)}</text>''')

    return '\n'.join(svg_parts)


# ============================================================================
# DATA URL ENCODER
# ============================================================================

def generate_svg_data_url(title: str, bullets: List[str],
                         width: int = 1280, height: int = 720,
                         slide_type: str = 'auto') -> str:
    """Generate enhanced SVG and return as data URL"""
    svg = generate_enhanced_slide(title, bullets, width, height, slide_type)
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"
