"""
Smart article fetcher that automatically falls back to Playwright for blocked sites.
"""

from ingestion.fetch_article import fetch_article_text
import os


# Sites known to block basic scrapers
PLAYWRIGHT_REQUIRED_DOMAINS = [
    'reuters.com',
    'wsj.com',
    'ft.com',
    'bloomberg.com',
    'nytimes.com',  # Sometimes blocks
    'economist.com',
]


def fetch_article_text_smart(url: str, max_chars: int = 15000):
    """
    Intelligently chooses between basic scraping and Playwright based on the URL.
    Falls back to Playwright if basic scraping fails.
    """
    # Check if domain is known to require Playwright
    url_lower = url.lower()
    requires_playwright = any(domain in url_lower for domain in PLAYWRIGHT_REQUIRED_DOMAINS)

    # Force Playwright via environment variable
    force_playwright = os.getenv('FORCE_PLAYWRIGHT', 'false').lower() == 'true'

    if requires_playwright or force_playwright:
        print(f"[Smart Fetch] Using Playwright for known protected site: {url}")
        try:
            from ingestion.fetch_article_playwright import fetch_article_text_playwright
            return fetch_article_text_playwright(url, max_chars)
        except ImportError:
            print("[Smart Fetch] Playwright not installed. Install with: pip install playwright && playwright install chromium")
            print("[Smart Fetch] Falling back to basic scraper (may fail)...")
            # Continue to basic scraper as fallback
        except Exception as e:
            print(f"[Smart Fetch] Playwright failed: {e}. Trying basic scraper...")
            # Continue to basic scraper as fallback

    # Try basic scraper first
    try:
        print(f"[Smart Fetch] Attempting basic scraper for: {url}")
        return fetch_article_text(url, max_chars)
    except Exception as e:
        error_msg = str(e).lower()

        # Check if it's a bot detection error
        bot_detection_keywords = ['403', 'forbidden', 'blocked', 'access denied', 'cloudflare']
        is_bot_detection = any(keyword in error_msg for keyword in bot_detection_keywords)

        if is_bot_detection:
            print(f"[Smart Fetch] Bot detection triggered ({e}). Retrying with Playwright...")
            try:
                from ingestion.fetch_article_playwright import fetch_article_text_playwright
                return fetch_article_text_playwright(url, max_chars)
            except ImportError:
                raise ValueError(
                    f"Site blocked basic scraper. Install Playwright to bypass: "
                    f"pip install playwright && playwright install chromium"
                )
            except Exception as playwright_error:
                raise ValueError(
                    f"Both scrapers failed. Basic: {e}. Playwright: {playwright_error}"
                )
        else:
            # Not a bot detection error, re-raise original exception
            raise


# Convenience function for backward compatibility
def fetch_article(url: str, max_chars: int = 15000):
    """Alias for fetch_article_text_smart"""
    return fetch_article_text_smart(url, max_chars)
