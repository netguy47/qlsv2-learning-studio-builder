import base64
import os
import urllib.parse

try:
    import cairosvg
except Exception:  # pragma: no cover - optional dependency
    cairosvg = None


def _decode_svg_data_url(data_url: str) -> str | None:
    if not data_url or not data_url.startswith("data:image/svg+xml"):
        return None
    if "," not in data_url:
        return None
    header, data = data_url.split(",", 1)
    if ";base64" in header:
        try:
            return base64.b64decode(data).decode("utf-8")
        except Exception:
            return None
    try:
        return urllib.parse.unquote(data)
    except Exception:
        return None


def svg_data_url_to_png_path(data_url: str, output_path: str) -> str:
    if cairosvg is None:
        raise RuntimeError("cairosvg is required to convert SVG to PNG.")
    svg_text = _decode_svg_data_url(data_url)
    if not svg_text:
        raise ValueError("Invalid SVG data URL.")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cairosvg.svg2png(bytestring=svg_text.encode("utf-8"), write_to=output_path)
    return output_path
