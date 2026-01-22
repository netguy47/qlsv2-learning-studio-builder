"""
Advanced article fetcher using Playwright for sites that block basic scrapers.
Use this for high-security sites like Reuters, WSJ, etc.

Installation required:
pip install playwright
playwright install chromium
"""

import json
import re
from bs4 import BeautifulSoup

MIN_PARAGRAPH_LEN = 20
MIN_TOTAL_LEN = 500


def fetch_article_text_playwright(url: str, max_chars: int = 15000):
    """
    Fetches and extracts readable text from a webpage using Playwright.
    This bypasses most bot detection systems by using a real browser.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise ImportError(
            "Playwright not installed. Run: pip install playwright && playwright install chromium"
        )

    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)

        # Create context with realistic settings
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="America/New_York",
        )

        # Set additional headers
        context.set_extra_http_headers({
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
        })

        page = context.new_page()

        try:
            # Navigate to the page with increased timeout
            page.goto(url, wait_until="domcontentloaded", timeout=30000)

            # Wait a bit for dynamic content to load
            page.wait_for_timeout(2000)

            # Get the page HTML
            html = page.content()

        finally:
            browser.close()

    # Parse with BeautifulSoup (same logic as fetch_article.py)
    if not html or not html.strip():
        raise ValueError("Fetched HTML is empty")

    soup = BeautifulSoup(html, "html.parser")

    # Remove junk
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    # Try JSON-LD article body first
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = script.string
            if not data:
                continue
            obj = json.loads(data)
            candidates = obj if isinstance(obj, list) else [obj]
            for item in candidates:
                if isinstance(item, dict):
                    body = item.get("articleBody") or item.get("description")
                    if body and len(body.strip()) >= MIN_TOTAL_LEN:
                        return body.strip()[:max_chars]
        except Exception:
            continue

    # Heuristic: search script tags for embedded articleBody fields
    for script in soup.find_all("script"):
        text = script.string or ""
        if "articleBody" not in text:
            continue
        matches = re.findall(r'"articleBody"\s*:\s*"([^"]+)"', text)
        if not matches:
            continue
        candidates = [m.encode('utf-8').decode('unicode_escape') for m in matches]
        candidates.sort(key=len, reverse=True)
        if candidates and len(candidates[0].strip()) >= MIN_TOTAL_LEN:
            return candidates[0].strip()[:max_chars]

    # Try extracting from common article containers
    text = ""

    article_selectors = [
        ("article", None),
        ("div", {"class": lambda x: x and any(cls in str(x).lower() for cls in ["article", "post", "content", "entry", "story"])}),
        ("main", None),
        ("div", {"id": lambda x: x and any(cls in str(x).lower() for cls in ["article", "content", "main"])}),
    ]

    for tag, attrs in article_selectors:
        container = soup.find(tag, attrs)
        if container:
            container_paragraphs = [
                p.get_text(" ", strip=True)
                for p in container.find_all("p")
                if p.get_text(strip=True)
            ]

            filtered = [p for p in container_paragraphs if len(p) > 40]
            if not filtered:
                filtered = [p for p in container_paragraphs if len(p) >= MIN_PARAGRAPH_LEN]

            candidate_text = "\n\n".join(filtered)
            if len(candidate_text.strip()) >= MIN_TOTAL_LEN:
                text = candidate_text
                break

    # Fallback: extract all paragraphs
    if len(text.strip()) < MIN_TOTAL_LEN:
        paragraphs = [
            p.get_text(" ", strip=True)
            for p in soup.find_all("p")
            if p.get_text(strip=True)
        ]

        filtered = [p for p in paragraphs if len(p) > 40]
        if len("\n".join(filtered)) < MIN_TOTAL_LEN:
            filtered = [p for p in paragraphs if len(p) >= MIN_PARAGRAPH_LEN]

        text = "\n\n".join(filtered)

    # Last resort: get all text from body
    if len(text.strip()) < MIN_TOTAL_LEN:
        container = soup.find("article") or soup.find("main") or soup.body
        if container:
            fallback_text = container.get_text(" ", strip=True)
            fallback_text = " ".join(fallback_text.split())
            if len(fallback_text) > len(text):
                text = fallback_text

    # Meta description as absolute last resort
    if len(text.strip()) < MIN_TOTAL_LEN:
        meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if meta_desc and meta_desc.get("content"):
            text = meta_desc["content"].strip()

    text = text[:max_chars]
    sample = text[:200].replace("\n", " ").strip()
    print(f"[Playwright Ingest] Extracted length {len(text)} sample: {sample}")
    return text
