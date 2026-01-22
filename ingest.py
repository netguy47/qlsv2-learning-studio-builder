import requests
from ingestion.fetch_article_ultimate import fetch_article_text
from baseline import Baseline, Provenance, BaselineStatus
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs
import re
from datetime import datetime

MIN_SOURCE_LENGTH = 0
MIN_TRANSCRIPT_HARD_MIN = 200
MIN_TRANSCRIPT_PREFERRED_MIN = 500

def ingest_source(source_type, input_value):
    if source_type == "URL":
        return ingest_url(input_value)
    if source_type == "YouTube":
        return ingest_youtube(input_value)
    if source_type == "Paste":
        return ingest_paste(input_value)
    raise ValueError("Unknown source type")


def ingest_url(url):
    try:
        text = fetch_article_text(url)
        
        # Validate content length
        if len(text.strip()) < MIN_SOURCE_LENGTH:
            prov = Provenance(
                source_type="url",
                source_url=url,
                retrieved_at=datetime.utcnow().isoformat(),
                notes="Ingested from URL (insufficient content)"
            )
            return Baseline(
                content=text,
                source_type="url",
                source_ref=url,
                provenance=[prov],
                status=BaselineStatus.INSUFFICIENT_CONTENT,
                error_message=f"Source text is too short ({len(text.strip())} characters). Minimum {MIN_SOURCE_LENGTH} characters required."
            )
        
        prov = Provenance(
            source_type="url",
            source_url=url,
            retrieved_at=datetime.utcnow().isoformat(),
            notes="Ingested from URL"
        )
        return Baseline(
            content=text,
            source_type="url",
            source_ref=url,
            provenance=[prov],
            status=BaselineStatus.OK
        )
    except Exception as e:
        prov = Provenance(
            source_type="url",
            source_url=url,
            retrieved_at=datetime.utcnow().isoformat(),
            notes="Failed to fetch URL"
        )
        return Baseline(
            content="",
            source_type="url",
            source_ref=url,
            provenance=[prov],
            status=BaselineStatus.ERROR,
            error_message=f"Failed to fetch URL: {str(e)}"
        )


def _extract_youtube_id(url):
    if not url:
        return None
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    path = parsed.path.strip("/")

    if "youtu.be" in host:
        return path.split("/")[0] if path else None

    if "youtube.com" in host:
        if path.startswith("watch"):
            qs = parse_qs(parsed.query)
            return qs.get("v", [None])[0]
        if path.startswith("shorts/"):
            return path.split("/")[1] if len(path.split("/")) > 1 else None
        if path.startswith("live/"):
            return path.split("/")[1] if len(path.split("/")) > 1 else None

    match = re.search(r"([a-zA-Z0-9_-]{11})", url)
    return match.group(1) if match else None


def _fetch_transcript(video_id):
    languages = ["en", "en-US", "en-GB"]
    try:
        api = YouTubeTranscriptApi()
        if hasattr(api, "fetch"):
            try:
                return api.fetch(video_id, languages=languages)
            except TypeError:
                return api.fetch(video_id)
    except Exception:
        pass

    if hasattr(YouTubeTranscriptApi, "get_transcript"):
        try:
            return YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
        except TypeError:
            return YouTubeTranscriptApi.get_transcript(video_id)

    raise AttributeError("YouTubeTranscriptApi has no compatible transcript method.")

def _transcript_to_text(transcript):
    if transcript is None:
        return ""
    if hasattr(transcript, "to_raw_data"):
        try:
            transcript = transcript.to_raw_data()
        except Exception:
            pass
    if hasattr(transcript, "snippets"):
        transcript = transcript.snippets
    if isinstance(transcript, dict):
        transcript = transcript.get("snippets") or transcript.get("transcript") or []
    if not isinstance(transcript, list):
        transcript = [transcript]

    parts = []
    for seg in transcript:
        if isinstance(seg, dict) and "text" in seg:
            parts.append(seg["text"])
        elif hasattr(seg, "text"):
            parts.append(seg.text)
        else:
            parts.append(str(seg))
    return " ".join(p for p in parts if p)


def ingest_youtube(url):
    try:
        video_id = _extract_youtube_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL. Could not extract video ID.")

        transcript = _fetch_transcript(video_id)
        text = _transcript_to_text(transcript)

        transcript_len = len(text.strip())
        # Validate transcript length
        if transcript_len < MIN_TRANSCRIPT_HARD_MIN:
            prov = Provenance(
                source_type="youtube",
                source_url=url,
                retrieved_at=datetime.utcnow().isoformat(),
                notes="Transcript from YouTube video (insufficient content)"
            )
            return Baseline(
                content=text,
                source_type="youtube",
                source_ref=url,
                provenance=[prov],
                status=BaselineStatus.INSUFFICIENT_CONTENT,
                error_message=f"Transcript is too short ({transcript_len} characters). Minimum {MIN_TRANSCRIPT_HARD_MIN} characters required."
            )
        if transcript_len < MIN_TRANSCRIPT_PREFERRED_MIN:
            prov = Provenance(
                source_type="youtube",
                source_url=url,
                retrieved_at=datetime.utcnow().isoformat(),
                notes="Transcript from YouTube video (limited context length)"
            )
            return Baseline(
                content=text,
                source_type="youtube",
                source_ref=url,
                provenance=[prov],
                status=BaselineStatus.OK,
                error_message=None
            )

        prov = Provenance(
            source_type="youtube",
            source_url=url,
            retrieved_at=datetime.utcnow().isoformat(),
            notes="Transcript from YouTube video"
        )
        return Baseline(
            content=text,
            source_type="youtube",
            source_ref=url,
            provenance=[prov],
            status=BaselineStatus.OK
        )
    except Exception as e:
        prov = Provenance(
            source_type="youtube",
            source_url=url,
            retrieved_at=datetime.utcnow().isoformat(),
            notes="Failed to fetch transcript"
        )
        return Baseline(
            content="",
            source_type="youtube",
            source_ref=url,
            provenance=[prov],
            status=BaselineStatus.ERROR,
            error_message=f"Failed to fetch transcript: {str(e)}. Try a different video or paste a transcript."
        )


def ingest_paste(text):
    # Validate content length
    if len(text.strip()) < MIN_SOURCE_LENGTH:
        prov = Provenance(
            source_type="manual",
            source_url=None,
            retrieved_at=datetime.utcnow().isoformat(),
            notes="Manually pasted text (insufficient content)"
        )
        return Baseline(
            content=text,
            source_type="paste",
            source_ref="manual",
            provenance=[prov],
            status=BaselineStatus.INSUFFICIENT_CONTENT,
            error_message=f"Pasted text is too short ({len(text.strip())} characters). Minimum {MIN_SOURCE_LENGTH} characters required."
        )
    
    prov = Provenance(
        source_type="manual",
        source_url=None,
        retrieved_at=datetime.utcnow().isoformat(),
        notes="Manually pasted text"
    )
    return Baseline(
        content=text,
        source_type="paste",
        source_ref="manual",
        provenance=[prov],
        status=BaselineStatus.OK
    )
