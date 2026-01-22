import os

DEFAULT_THEME = {
    'bg_primary': '#0b1220',
    'bg_secondary': '#0f1b34',
    'bg_card': '#162642',
    'accent_primary': '#22d3ee',
    'accent_secondary': '#f59e0b',
    'accent_tertiary': '#fb7185',
    'text_primary': '#f8fafc',
    'text_secondary': '#cbd5f5',
    'text_muted': '#8aa0c2',
    'success': '#34d399',
    'warning': '#f59e0b',
    'error': '#fb7185',
    'divider': '#243b5c',
}


def _read_color(name: str, default: str) -> str:
    return os.getenv(name, default)


def load_theme() -> dict:
    return {
        'bg_primary': _read_color('VISUAL_BG_PRIMARY', DEFAULT_THEME['bg_primary']),
        'bg_secondary': _read_color('VISUAL_BG_SECONDARY', DEFAULT_THEME['bg_secondary']),
        'bg_card': _read_color('VISUAL_BG_CARD', DEFAULT_THEME['bg_card']),
        'accent_primary': _read_color('VISUAL_ACCENT_PRIMARY', DEFAULT_THEME['accent_primary']),
        'accent_secondary': _read_color('VISUAL_ACCENT_SECONDARY', DEFAULT_THEME['accent_secondary']),
        'accent_tertiary': _read_color('VISUAL_ACCENT_TERTIARY', DEFAULT_THEME['accent_tertiary']),
        'text_primary': _read_color('VISUAL_TEXT_PRIMARY', DEFAULT_THEME['text_primary']),
        'text_secondary': _read_color('VISUAL_TEXT_SECONDARY', DEFAULT_THEME['text_secondary']),
        'text_muted': _read_color('VISUAL_TEXT_MUTED', DEFAULT_THEME['text_muted']),
        'success': _read_color('VISUAL_SUCCESS', DEFAULT_THEME['success']),
        'warning': _read_color('VISUAL_WARNING', DEFAULT_THEME['warning']),
        'error': _read_color('VISUAL_ERROR', DEFAULT_THEME['error']),
        'divider': _read_color('VISUAL_DIVIDER', DEFAULT_THEME['divider']),
    }


THEME = load_theme()
FONT_FAMILY = os.getenv('VISUAL_FONT_FAMILY', "Poppins, 'Trebuchet MS', sans-serif")
