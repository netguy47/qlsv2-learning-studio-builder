import base64


def generate_svg_data_url(title, lines, width=1024, height=1024):
    safe_title = (title or "Infographic").strip()
    safe_lines = [line.strip() for line in (lines or []) if line.strip()]
    safe_lines = safe_lines[:8]

    y_start = 140
    line_height = 42
    lines_svg = []
    for idx, line in enumerate(safe_lines):
        y = y_start + (idx * line_height)
        lines_svg.append(
            f'<text x="80" y="{y}" font-size="28" fill="#cbd5e1" font-family="Arial">{_escape(line)}</text>'
        )

    svg = f"""<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a192f"/>
  <text x="80" y="90" font-size="40" fill="#64ffda" font-family="Arial" font-weight="700">{_escape(safe_title)}</text>
  {''.join(lines_svg)}
</svg>"""

    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _escape(value):
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
