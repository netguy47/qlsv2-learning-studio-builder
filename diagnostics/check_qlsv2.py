import json
import os
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENV_FILES = [ROOT / ".env", ROOT / ".env.local"]


def load_env_keys():
    keys = set()
    for env_path in ENV_FILES:
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key = line.split("=", 1)[0].strip()
            if key:
                keys.add(key)
    return keys


def _load_env_file(path: Path):
    keys = set()
    if not path.exists():
        return keys
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key = line.split("=", 1)[0].strip()
        if key:
            keys.add(key)
    return keys


def check_env():
    env_keys = _load_env_file(ROOT / ".env")
    env_local_keys = _load_env_file(ROOT / ".env.local")
    required = ["POLLINATIONS_API_KEY", "GEMINI_API_KEY", "FLASK_PORT"]
    result = {
        "env": {key: (key in env_keys) for key in required},
        "env_local": {key: (key in env_local_keys) for key in required},
    }
    return result


def check_ingest_min_source():
    path = ROOT / "ingest.py"
    if not path.exists():
        return False, "ingest.py not found"
    text = path.read_text(encoding="utf-8")
    match = re.search(r"MIN_SOURCE_LENGTH\s*=\s*(\d+)", text)
    if not match:
        return False, "MIN_SOURCE_LENGTH not found"
    return match.group(1) == "0", f"MIN_SOURCE_LENGTH={match.group(1)}"


def check_longform_bypass():
    path = ROOT / "longform.ts"
    if not path.exists():
        return False, "longform.ts not found"
    text = path.read_text(encoding="utf-8")
    has_error = "Produced ${countWords(output)} words" in text
    has_bypass = "shouldHydrate" in text and "countWords(output) < minWords" in text
    return has_error and has_bypass, "bypass guard present" if has_error and has_bypass else "bypass guard missing"


def check_should_hydrate_flag():
    path = ROOT / "App.tsx"
    if not path.exists():
        return False, "App.tsx not found"
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(r"handleSelectOutput[\\s\\S]*shouldHydrate\\s*:", re.MULTILINE)
    return bool(pattern.search(text)), "shouldHydrate passed" if pattern.search(text) else "shouldHydrate not found in handleSelectOutput"


def check_ports_in_bats():
    start_path = ROOT / "start.bat"
    stop_path = ROOT / "stop.bat"
    start_text = start_path.read_text(encoding="utf-8") if start_path.exists() else ""
    stop_text = stop_path.read_text(encoding="utf-8") if stop_path.exists() else ""

    start_has_3000 = "localhost:3000" in start_text
    start_has_5000 = "localhost:5000" in start_text
    stop_has_3000 = "localhost:3000" in stop_text
    stop_has_5000 = "localhost:5000" in stop_text

    return {
        "start.bat": {"3000": start_has_3000, "5000": start_has_5000},
        "stop.bat": {"3000": stop_has_3000, "5000": stop_has_5000},
    }


def build_test_phrase():
    base = "This is a 65-character test phrase for diagnostics."
    if len(base) == 65:
        return base
    if len(base) > 65:
        return base[:65]
    return base + (" " * (65 - len(base)))


def ping_endpoints():
    try:
        import requests  # type: ignore
    except Exception as exc:
        return {"error": f"requests not available: {exc}"}

    phrase = build_test_phrase()
    payload = {
        "baseline": {
            "content": phrase,
            "source_type": "text",
            "source_ref": "diagnostic",
            "status": "ok",
        },
        "shouldHydrate": False,
    }

    results = {}
    for endpoint in ["infographic", "generate"]:
        url = f"http://localhost:5000/{endpoint}"
        try:
            resp = requests.post(url, json=payload, timeout=10)
            results[endpoint] = {
                "status": resp.status_code,
                "ok": resp.ok,
                "body": resp.text[:500],
            }
        except Exception as exc:
            results[endpoint] = {"error": str(exc)}
    return results


def check_podcast_length():
    try:
        import requests  # type: ignore
    except Exception as exc:
        return {"error": f"requests not available: {exc}"}

    sentence = "This is a one sentence prompt about emerging defense technology."
    payload = {
        "baseline": {
            "content": sentence,
            "source_type": "text",
            "source_ref": "diagnostic",
            "status": "ok",
        },
        "generate_audio": False,
        "shouldHydrate": False,
    }
    url = "http://localhost:5000/podcast"
    try:
        resp = requests.post(url, json=payload, timeout=15)
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        content = data.get("content", "")
        return {
            "status": resp.status_code,
            "ok": resp.ok,
            "length": len(content),
            "meets_500_chars": len(content) >= 500,
        }
    except Exception as exc:
        return {"error": str(exc)}


def check_report_sections():
    try:
        import requests  # type: ignore
    except Exception as exc:
        return {"error": f"requests not available: {exc}"}

    sentence = "This is a one sentence prompt about defense technology trends."
    payload = {
        "baseline": {
            "content": sentence,
            "source_type": "text",
            "source_ref": "diagnostic",
            "status": "ok",
        },
        "generate_audio": False,
        "shouldHydrate": False,
    }
    url = "http://localhost:5000/report"
    try:
        resp = requests.post(url, json=payload, timeout=15)
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        content = data.get("content", "")
        section_count = len([line for line in content.splitlines() if line.strip().startswith("#")])
        return {
            "status": resp.status_code,
            "ok": resp.ok,
            "sections": section_count,
            "meets_3_sections": section_count >= 3,
        }
    except Exception as exc:
        return {"error": str(exc)}


def check_notes_density():
    path = ROOT / "renderers" / "report.py"
    if not path.exists():
        return False, "report.py not found"
    text = path.read_text(encoding="utf-8")
    if "summary" in text.lower() and "density" in text.lower():
        return True, "summary density logic detected"
    return False, "summary density logic not detected"


def check_bento_infographic():
    path = ROOT / "clients" / "svg_infographic_enhanced.py"
    if not path.exists():
        return False, "svg_infographic_enhanced.py not found"
    text = path.read_text(encoding="utf-8")
    return ("bento" in text.lower()), "bento grid detected" if "bento" in text.lower() else "bento grid not detected"


def check_slide_prefetch():
    path = ROOT / "components" / "OutputViewer.tsx"
    if not path.exists():
        return False, "OutputViewer.tsx not found"
    text = path.read_text(encoding="utf-8")
    if "prefetch" in text.lower() or "cache" in text.lower():
        return True, "prefetch/cache logic detected"
    return False, "prefetch/cache logic not detected"


def check_pollinations_latency():
    try:
        import requests  # type: ignore
    except Exception as exc:
        return {"error": f"requests not available: {exc}"}
    url = "http://localhost:5000/image"
    params = {"prompt": "health check", "model": "flux", "width": 64, "height": 64}
    try:
        import time
        start = time.time()
        resp = requests.get(url, params=params, timeout=5)
        elapsed = time.time() - start
        return {
            "status": resp.status_code,
            "ok": resp.ok,
            "latency_seconds": round(elapsed, 2),
            "meets_3s": elapsed <= 3,
        }
    except Exception as exc:
        return {"error": str(exc)}


def check_cors():
    env_keys = _load_env_file(ROOT / ".env")
    env_local = _load_env_file(ROOT / ".env.local")
    cors_value = None
    for path in [ROOT / ".env.local", ROOT / ".env"]:
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("ALLOWED_ORIGINS="):
                cors_value = line.split("=", 1)[1]
                break
        if cors_value:
            break
    if cors_value:
        return "localhost:5173" in cors_value, f"ALLOWED_ORIGINS={cors_value}"
    # Fall back to server default
    server_text = (ROOT / "server.py").read_text(encoding="utf-8")
    default_match = re.search(r"ALLOWED_ORIGINS',\\s*'([^']+)'", server_text)
    if default_match:
        default_val = default_match.group(1)
        return "localhost:5173" in default_val, f"default={default_val}"
    return False, "ALLOWED_ORIGINS not found"


def main():
    env_status = check_env()
    min_ok, min_note = check_ingest_min_source()
    longform_ok, longform_note = check_longform_bypass()
    hydrate_ok, hydrate_note = check_should_hydrate_flag()
    ports = check_ports_in_bats()
    endpoint_results = ping_endpoints()
    podcast_check = check_podcast_length()
    report_check = check_report_sections()
    notes_ok, notes_note = check_notes_density()
    bento_ok, bento_note = check_bento_infographic()
    prefetch_ok, prefetch_note = check_slide_prefetch()
    pollinations_check = check_pollinations_latency()
    cors_ok, cors_note = check_cors()

    report = {
        "env_keys_present": env_status,
        "baseline_integrity": {
            "ingest_min_source_length_zero": {"ok": min_ok, "detail": min_note},
            "handleSelectOutput_shouldHydrate": {"ok": hydrate_ok, "detail": hydrate_note},
        },
        "format_validation": {
            "podcast_length_over_500_chars": podcast_check,
            "report_sections_at_least_3": report_check,
            "notes_high_density_summary": {"ok": notes_ok, "detail": notes_note},
            "infographic_bento_grid": {"ok": bento_ok, "detail": bento_note},
            "slide_prefetch_cache": {"ok": prefetch_ok, "detail": prefetch_note},
        },
        "ports_in_bat_files": ports,
        "endpoint_checks": endpoint_results,
        "network_services": {
            "pollinations_flux_latency": pollinations_check,
            "cors_localhost_5173": {"ok": cors_ok, "detail": cors_note},
        },
    }

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    sys.exit(main())
