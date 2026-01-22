"""
Ultimate article fetcher with multiple fallback strategies.

Tries methods in order of speed/reliability:
1. Trafilatura (best for articles, fast)
2. Enhanced basic scraper (custom, fast)
3. Playwright (slow but works on protected sites)

This gives the best balance of speed, reliability, and coverage.
"""

import os


def fetch_article_text_ultimate(url: str, max_chars: int = 15000):
    """
    Tries multiple scraping methods until one succeeds.

    Priority order:
    1. Trafilatura - Fast, excellent for news articles
    2. Basic scraper - Fast, good for most sites
    3. Playwright - Slow, works on protected sites

    Args:
        url: The URL to fetch
        max_chars: Maximum characters to return

    Returns:
        Extracted article text

    Raises:
        ValueError: If all methods fail
    """
    errors = []

    # Method 1: Try Trafilatura first (if installed)
    try:
        from ingestion.fetch_article_trafilatura import fetch_article_text_trafilatura
        print(f"[Ultimate Fetch] Attempting Trafilatura for: {url}")
        return fetch_article_text_trafilatura(url, max_chars)
    except ImportError:
        print("[Ultimate Fetch] Trafilatura not installed (pip install trafilatura)")
    except Exception as e:
        error_msg = f"Trafilatura failed: {str(e)}"
        print(f"[Ultimate Fetch] {error_msg}")
        errors.append(error_msg)

    # Method 2: Try enhanced basic scraper
    try:
        from ingestion.fetch_article import fetch_article_text
        print(f"[Ultimate Fetch] Attempting basic scraper for: {url}")
        return fetch_article_text(url, max_chars)
    except Exception as e:
        error_msg = f"Basic scraper failed: {str(e)}"
        print(f"[Ultimate Fetch] {error_msg}")
        errors.append(error_msg)

        # Check if it's a bot detection error
        error_str = str(e).lower()
        bot_detected = any(
            keyword in error_str
            for keyword in ['403', 'forbidden', 'blocked', 'access denied', 'cloudflare']
        )

        if not bot_detected:
            # Not a bot detection issue, probably network or content issue
            # Skip Playwright and fail fast
            raise ValueError(
                f"Failed to fetch article. Errors: {' | '.join(errors)}"
            )

    # Method 3: Try Playwright (only if bot detection occurred)
    try:
        from ingestion.fetch_article_playwright import fetch_article_text_playwright
        print(f"[Ultimate Fetch] Bot detected. Attempting Playwright for: {url}")
        return fetch_article_text_playwright(url, max_chars)
    except ImportError:
        error_msg = (
            "Playwright not installed. Site requires browser automation. "
            "Install with: pip install playwright && playwright install chromium"
        )
        print(f"[Ultimate Fetch] {error_msg}")
        errors.append(error_msg)
    except Exception as e:
        error_msg = f"Playwright failed: {str(e)}"
        print(f"[Ultimate Fetch] {error_msg}")
        errors.append(error_msg)

    # All methods failed
    raise ValueError(
        f"All scraping methods failed for {url}. "
        f"Errors: {' | '.join(errors)}"
    )


def fetch_article_text(url: str, max_chars: int = 15000):
    """
    Main entry point for article fetching.
    Uses the ultimate fetcher by default.
    """
    # Check if user wants to force a specific method
    force_method = os.getenv('SCRAPER_METHOD', 'ultimate').lower()

    if force_method == 'trafilatura':
        from ingestion.fetch_article_trafilatura import fetch_article_text_trafilatura
        return fetch_article_text_trafilatura(url, max_chars)

    elif force_method == 'basic':
        from ingestion.fetch_article import fetch_article_text as basic_fetch
        return basic_fetch(url, max_chars)

    elif force_method == 'playwright':
        from ingestion.fetch_article_playwright import fetch_article_text_playwright
        return fetch_article_text_playwright(url, max_chars)

    else:  # 'ultimate' or default
        return fetch_article_text_ultimate(url, max_chars)
