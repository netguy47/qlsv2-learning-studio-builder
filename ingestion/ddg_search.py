import requests
from bs4 import BeautifulSoup

def ddg_search(query: str, max_results: int = 5):
    """
    Returns a list of {title, url} dicts.
    No content fetched yet.
    """
    url = "https://duckduckgo.com/html/"
    resp = requests.post(
        url,
        data={"q": query},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=15
    )
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    for a in soup.select(".result__a")[:max_results]:
        title = a.get_text(strip=True)
        link = a.get("href")
        if title and link:
            results.append({"title": title, "url": link})

    return results
