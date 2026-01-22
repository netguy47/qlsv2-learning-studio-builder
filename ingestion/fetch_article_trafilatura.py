"""
Article fetcher using Trafilatura - industry-leading content extraction library.
Trafilatura has the best accuracy for extracting main content from web pages.

GitHub: https://github.com/adbar/trafilatura
Installation: pip install trafilatura
"""

import trafilatura
from trafilatura.settings import use_config

MIN_TOTAL_LEN = 500


def fetch_article_text_trafilatura(url: str, max_chars: int = 15000):
    """
    Fetches and extracts readable text using Trafilatura.

    Trafilatura is specifically designed for web scraping and has:
    - Excellent content extraction accuracy
    - Built-in handling of various site structures
    - Good performance
    - Regular updates for new site patterns

    Args:
        url: The URL to fetch
        max_chars: Maximum characters to return

    Returns:
        Extracted article text
    """
    # Configure Trafilatura for better results
    config = use_config()
    config.set("DEFAULT", "EXTRACTION_TIMEOUT", "30")

    # Download the webpage
    # Trafilatura handles User-Agent and headers automatically
    downloaded = trafilatura.fetch_url(url)

    if not downloaded:
        raise ValueError(f"Failed to download content from {url}")

    # Extract main content with various options
    text = trafilatura.extract(
        downloaded,
        include_comments=False,  # Exclude comment sections
        include_tables=True,     # Include tables (useful for data articles)
        no_fallback=False,       # Use fallback extraction if primary fails
        favor_precision=False,   # Favor recall (get more content) over precision
        favor_recall=True,       # Get as much content as possible
        config=config
    )

    if not text or len(text.strip()) < MIN_TOTAL_LEN:
        # Try with different settings - favor precision this time
        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=True,
            no_fallback=False,
            favor_precision=True,
            config=config
        )

    if not text:
        raise ValueError(f"Could not extract text from {url}")

    if len(text.strip()) < MIN_TOTAL_LEN:
        raise ValueError(
            f"Extracted text too short ({len(text.strip())} chars). "
            f"Minimum {MIN_TOTAL_LEN} chars required."
        )

    # Limit to max_chars
    text = text[:max_chars]

    sample = text[:200].replace("\n", " ").strip()
    print(f"[Trafilatura Ingest] Extracted length {len(text)} sample: {sample}")

    return text


def fetch_article_text_with_metadata(url: str, max_chars: int = 15000):
    """
    Fetches article with metadata (title, author, date, etc.)

    Returns:
        dict with keys: text, title, author, date, url
    """
    config = use_config()
    config.set("DEFAULT", "EXTRACTION_TIMEOUT", "30")

    downloaded = trafilatura.fetch_url(url)

    if not downloaded:
        raise ValueError(f"Failed to download content from {url}")

    # Extract with metadata
    result = trafilatura.extract(
        downloaded,
        include_comments=False,
        include_tables=True,
        output_format='json',  # Get structured output
        with_metadata=True,
        config=config
    )

    if not result:
        raise ValueError(f"Could not extract content from {url}")

    import json
    data = json.loads(result) if isinstance(result, str) else result

    text = data.get('text', '') or data.get('raw_text', '')

    if len(text.strip()) < MIN_TOTAL_LEN:
        raise ValueError(
            f"Extracted text too short ({len(text.strip())} chars). "
            f"Minimum {MIN_TOTAL_LEN} chars required."
        )

    return {
        'text': text[:max_chars],
        'title': data.get('title', ''),
        'author': data.get('author', ''),
        'date': data.get('date', ''),
        'url': data.get('url', url),
        'hostname': data.get('hostname', ''),
    }
