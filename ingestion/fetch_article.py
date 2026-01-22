import json
import re
import requests
from bs4 import BeautifulSoup

MIN_PARAGRAPH_LEN = 20
MIN_TOTAL_LEN = 500

def fetch_article_text(url: str, max_chars: int = 15000):
    """
    Fetches and extracts readable text from a webpage.
    Uses realistic browser headers to avoid bot detection.
    """
    # Realistic Chrome browser headers to bypass bot detection
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }

    resp = requests.get(url, headers=headers, timeout=20)
    resp.raise_for_status()

    html = resp.text or ""
    if not html.strip():
        raise ValueError("Fetched HTML is empty")
    soup = BeautifulSoup(html, "html.parser")

    # remove junk
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    # Try JSON-LD article body first (common on MSN and news sites)
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
        # Pick the longest candidate
        candidates = [m.encode('utf-8').decode('unicode_escape') for m in matches]
        candidates.sort(key=len, reverse=True)
        if candidates and len(candidates[0].strip()) >= MIN_TOTAL_LEN:
            return candidates[0].strip()[:max_chars]

    # Try extracting from common article containers first
    text = ""

    # Try common article selectors used by modern websites
    article_selectors = [
        ("article", None),  # <article> tag
        ("div", {"class": lambda x: x and any(cls in str(x).lower() for cls in ["article", "post", "content", "entry", "story"])}),
        ("main", None),  # <main> tag
        ("div", {"id": lambda x: x and any(cls in str(x).lower() for cls in ["article", "content", "main"])}),
    ]

    for tag, attrs in article_selectors:
        container = soup.find(tag, attrs)
        if container:
            # Extract paragraphs from this container
            container_paragraphs = [
                p.get_text(" ", strip=True)
                for p in container.find_all("p")
                if p.get_text(strip=True)
            ]

            # Filter for substantial paragraphs
            filtered = [p for p in container_paragraphs if len(p) > 40]
            if not filtered:
                filtered = [p for p in container_paragraphs if len(p) >= MIN_PARAGRAPH_LEN]

            candidate_text = "\n\n".join(filtered)
            if len(candidate_text.strip()) >= MIN_TOTAL_LEN:
                text = candidate_text
                break

    # Fallback: extract all paragraphs from page
    if len(text.strip()) < MIN_TOTAL_LEN:
        paragraphs = [
            p.get_text(" ", strip=True)
            for p in soup.find_all("p")
            if p.get_text(strip=True)
        ]

        # Prefer longer paragraphs first
        filtered = [p for p in paragraphs if len(p) > 40]

        # If total is still short, relax the filter to include medium paragraphs
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

    # ONLY use meta description as absolute last resort
    if len(text.strip()) < MIN_TOTAL_LEN:
        meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if meta_desc and meta_desc.get("content"):
            text = meta_desc["content"].strip()

    text = text[:max_chars]
    sample = text[:200].replace("\n", " ").strip()
    print(f"[Ingest] Extracted length {len(text)} sample: {sample}")
    return text
