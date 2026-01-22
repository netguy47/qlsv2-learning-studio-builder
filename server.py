from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ingest import ingest_source
from renderers.report import generate as generate_report
from renderers.podcast import generate as generate_podcast
from renderers.infographic import generate as generate_infographic_old
from renderers.infographic_enhanced import generate as generate_infographic
from renderers.slides import generate as generate_slides
from clients.pollinations import generate_image, generate_text
from clients.openai_text import generate_text_with_retry
from exports import export_text, export_image
from tts import get_tts_provider
from storage_index import list_saved
import os
import uuid
import time
from datetime import datetime
import sys
sys.stdout.reconfigure(encoding='utf-8')

app = Flask(__name__)
app.start_time = time.time()

# Configure CORS based on environment
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
CORS(app, origins=[origin.strip() for origin in allowed_origins])

print(
    "Image provider:",
    (os.getenv("INFOGRAPHIC_IMAGE_PROVIDER") or "pollinations"),
    "| OPENAI_API_KEY set:",
    bool(os.getenv("OPENAI_API_KEY")),
)


def fortify_input(text: str, content_type: str = 'general') -> str:
    """
    Text hydration layer: if input is under 500 chars, expand to ~550-600 chars
    with format-specific prompts.
    Uses OpenAI if key present, otherwise Pollinations text.
    
    Args:
        text: Source text to hydrate
        content_type: Type of content ('podcast', 'infographic', 'slides', 'general')
    """
    source = (text or "").strip()
    if len(source) >= 500:
        return source

    if content_type == 'podcast':
        prompt = f"""You are a professional podcast script generator.
Goal: Expand the provided text into a 550-600 character host dialogue format.
Structure:
- Write as a conversational dialogue between two hosts (Alex and Maya).
- Include natural back-and-forth exchanges.
- Cover the topic with engaging questions and insights.
- Keep it conversational, engaging, and within 550-600 characters total.

Source:
{source}
"""
    elif content_type == 'infographic':
        prompt = f"""You are a professional infographic content generator.
Goal: Expand the provided text into a 550-600 character data-dense bullet format.
Structure:
- Use concise, high-density bullet points.
- Include specific numbers, percentages, or statistics where possible.
- Focus on key facts, trends, and actionable insights.
- Keep it factual, scannable, and within 550-600 characters total.

Source:
{source}
"""
    elif content_type == 'slides':
        prompt = f"""You are a professional slide content generator.
Goal: Expand the provided text into a 550-600 character bento grid data format.
Structure:
- Use high-density data points suitable for visual layouts.
- Include key metrics, comparisons, and visualizable data.
- Focus on information that works well in grid/card layouts.
- Keep it structured, visualizable, and within 550-600 characters total.

Source:
{source}
"""
    else:
        prompt = f"""You are a professional briefing generator.
Goal: Expand the provided text into a 550-600 character briefing.
Structure:
- Identify the domain (Tech, History, Science, etc.).
- Provide foundational context.
- Provide 2026 strategic impact/consequences.
Keep it concise, professional, and within 550-600 characters total.

Source:
{source}
"""
    
    try:
        if os.getenv("OPENAI_API_KEY"):
            return generate_text_with_retry(prompt, model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0.4, max_tokens=600, max_attempts=2)
        return generate_text(prompt, max_tokens=600)
    except Exception as e:
        print(f"[Fortify] hydration failed: {e}")
        return source

@app.route('/preview', methods=['POST'])
def preview():
    """Preview article text before confirming baseline."""
    data = request.json
    url = data.get('url')
    
    try:
        from ingestion.fetch_article import fetch_article_text
        text = fetch_article_text(url)
        if not text or not text.strip():
            return jsonify({
                'error': 'No extractable text found at this URL. Try another URL or paste the text manually.',
                'status': 'error'
            }), 422
        
        return jsonify({
            'content': text,
            'length': len(text),
            'status': 'ok'
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/hydrate', methods=['POST'])
def hydrate():
    """Hydrate short content with format-specific expansion."""
    data = request.json or {}
    content = data.get('content', '')
    content_type = data.get('content_type', 'general')
    
    if not content:
        return jsonify({'error': 'Missing content in request body'}), 400
    
    try:
        hydrated = fortify_input(content, content_type=content_type)
        return jsonify({
            'content': hydrated,
            'length': len(hydrated),
            'was_hydrated': len(hydrated) > len(content)
        })
    except Exception as e:
        return jsonify({'error': f'Hydration failed: {str(e)}'}), 500

@app.route('/ingest', methods=['POST'])
def ingest():
    data = request.json
    source_type = data.get('source_type')
    input_value = data.get('input_value')
    
    try:
        baseline = ingest_source(source_type, input_value)
        return jsonify({
            'content': baseline.content,
            'source_type': baseline.source_type,
            'source_ref': baseline.source_ref,
            'created_at': baseline.created_at,
            'status': baseline.status.value,
            'error_message': baseline.error_message,
            'provenance': [
                {
                    'source_type': p.source_type,
                    'source_url': p.source_url,
                    'retrieved_at': p.retrieved_at,
                    'notes': p.notes
                }
                for p in baseline.provenance
            ]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/report', methods=['POST'])
def report():
    data = request.json
    baseline_data = data.get('baseline')
    generate_audio = data.get('generate_audio', False)

    try:
        from baseline import Baseline, BaselineStatus
        baseline = Baseline(
            content=baseline_data['content'],
            source_type=baseline_data['source_type'],
            source_ref=baseline_data['source_ref'],
            created_at=baseline_data.get('created_at'),
            status=BaselineStatus(baseline_data.get('status', 'ok')),
            error_message=baseline_data.get('error_message')
        )

        # Check baseline status before generating
        if baseline.status != BaselineStatus.OK:
            return jsonify({
                'error': baseline.error_message or 'Source text is insufficient for generation.'
            }), 400

        result = generate_report(baseline)
        export_path = export_text(result, 'reports')

        # Generate audio narration if requested
        audio_filename = None
        if generate_audio:
            try:
                tts_provider = get_tts_provider()
                audio_dir = 'storage/audio'
                os.makedirs(audio_dir, exist_ok=True)
                audio_filename = f"report_{uuid.uuid4().hex[:8]}.mp3"
                audio_path = os.path.join(audio_dir, audio_filename)
                tts_provider.synthesize(result, audio_path)
                print(f"[Report] Generated audio narration: {audio_filename}")
            except Exception as audio_error:
                print(f"[Report] Audio generation failed: {audio_error}")
                # Don't fail the whole request if audio fails

        return jsonify({
            'content': result,
            'export_path': export_path,
            'audio_filename': audio_filename
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/podcast', methods=['POST'])
def podcast():
    data = request.json
    baseline_data = data.get('baseline')
    generate_audio = data.get('generate_audio', False)
    
    try:
        from baseline import Baseline, BaselineStatus
        baseline = Baseline(
            content=baseline_data['content'],
            source_type=baseline_data['source_type'],
            source_ref=baseline_data['source_ref'],
            created_at=baseline_data.get('created_at'),
            status=BaselineStatus(baseline_data.get('status', 'ok')),
            error_message=baseline_data.get('error_message')
        )
        
        # Check baseline status before generating
        if baseline.status != BaselineStatus.OK:
            return jsonify({
                'error': baseline.error_message or 'Source text is insufficient for generation.'
            }), 400
        
        result = generate_podcast(baseline, generate_audio=generate_audio)
        export_path = export_text(result['script'], 'podcasts')
        
        # Extract just the filename from the audio path
        audio_filename = None
        if result.get('audio_path'):
            audio_filename = os.path.basename(result['audio_path'])
        
        return jsonify({
            'script': result['script'],
            'audio_filename': audio_filename,
            'export_path': export_path
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/infographic', methods=['POST'])
def infographic():
    data = request.json or {}
    baseline_data = data.get('baseline')
    should_hydrate = data.get('shouldHydrate', False)
    insights = data.get('insights', '')
    
    try:
        from baseline import Baseline, BaselineStatus
        
        # If baseline data is missing but prompt is present, create baseline from prompt
        if not baseline_data:
            prompt = data.get('prompt', '')
            if not prompt:
                return jsonify({'error': 'Missing baseline data or prompt in request body'}), 400
            
            # Auto-detect if hydration is needed for short prompts
            if not should_hydrate:
                should_hydrate = len(prompt) < 500
            
            # Create baseline from prompt
            baseline_data = {
                'content': prompt,
                'source_type': 'manual',
                'source_ref': 'manual',
                'status': 'ok',
                'error_message': None
            }
        
        content_raw = baseline_data.get('content', '')
        if not content_raw:
            return jsonify({'error': 'Missing content in baseline data'}), 400
        
        # If insights are empty, hydrate immediately to ensure data density
        if not insights or len(insights.strip()) < 50:
            should_hydrate = True
        
        hydrated_content = fortify_input(content_raw, content_type='infographic') if should_hydrate else content_raw
        baseline = Baseline(
            content=hydrated_content,
            source_type=baseline_data.get('source_type', 'manual'),
            source_ref=baseline_data.get('source_ref', 'manual'),
            created_at=baseline_data.get('created_at'),
            status=BaselineStatus(baseline_data.get('status', 'ok')),
            error_message=baseline_data.get('error_message')
        )
        
        # Check baseline status before generating
        if baseline.status != BaselineStatus.OK:
            return jsonify({
                'error': baseline.error_message or 'Source text is insufficient for generation.'
            }), 400
        
        result = generate_infographic(baseline, should_hydrate=True)

        # Check if renderer returned None (insufficient source) - hydrate and retry
        if result is None:
            hydrated_content = fortify_input(content_raw, content_type='infographic')
            baseline_hydrated = Baseline(
                content=hydrated_content,
                source_type=baseline_data.get('source_type', 'manual'),
                source_ref=baseline_data.get('source_ref', 'manual'),
                created_at=baseline_data.get('created_at'),
                status=BaselineStatus.OK
            )
            result = generate_infographic(baseline_hydrated, should_hydrate=True)
            if result is None:
                return jsonify({'error': 'Source text required. The material provided is too limited to generate an infographic.'}), 500
        
        # Check if result is empty or contains only template without data
        if not result or (isinstance(result, str) and len(result) < 1000):
            return jsonify({'error': 'Infographic synthesis failed - insufficient data for generation.'}), 500
        
        # Check for empty text tags in SVG (indicates synthesis failure)
        if isinstance(result, str) and '<text>' in result:
            import re
            # Check if text tags are empty or contain only whitespace
            empty_text_tags = re.findall(r'<text[^>]*>\s*</text>', result)
            if empty_text_tags:
                return jsonify({'error': 'Infographic synthesis failed - empty content detected.'}), 500
        
        if isinstance(result, dict):
            image_url = result.get('image_url') or result.get('imageUrl')
            export_data = export_image(image_url, 'infographics')
            return jsonify({
                'imageUrl': image_url,
                'export_data': export_data,
                'prompt': result.get('prompt'),
                'analysis': result.get('analysis')
            })
        export_data = export_image(result, 'infographics')
        return jsonify({'imageUrl': result, 'export_data': export_data})
    except KeyError as e:
        return jsonify({'error': f'Missing required field: {str(e)}'}), 400
    except Exception as e:
        print(f"[Infographic] Error: {e}")
        return jsonify({'error': f'Failed to generate infographic: {str(e)}'}), 500

@app.route('/slides', methods=['POST'])
def slides():
    data = request.json or {}
    baseline_data = data.get('baseline')
    should_hydrate = data.get('shouldHydrate', False)
    
    try:
        from baseline import Baseline, BaselineStatus
        
        # Validate baseline data exists
        if not baseline_data:
            return jsonify({'error': 'Missing baseline data in request body'}), 400
        
        content_raw = baseline_data.get('content', '')
        if not content_raw:
            return jsonify({'error': 'Missing content in baseline data'}), 400
        
        hydrated_content = fortify_input(content_raw, content_type='slides') if should_hydrate else content_raw
        baseline = Baseline(
            content=hydrated_content,
            source_type=baseline_data.get('source_type', 'manual'),
            source_ref=baseline_data.get('source_ref', 'manual'),
            created_at=baseline_data.get('created_at'),
            status=BaselineStatus(baseline_data.get('status', 'ok')),
            error_message=baseline_data.get('error_message')
        )
        
        # Check baseline status before generating
        if baseline.status != BaselineStatus.OK:
            return jsonify({
                'error': baseline.error_message or 'Source text is insufficient for generation.'
            }), 400
        
        slide_count = data.get('slide_count', 6)
        result = generate_slides(baseline, slide_count=slide_count)
        
        # Check if renderer returned error message (insufficient source) - hydrate and retry
        if isinstance(result.get('slide_plan'), str) and 'insufficient' in result['slide_plan'].lower():
            hydrated_content = fortify_input(content_raw, content_type='slides')
            baseline_hydrated = Baseline(
                content=hydrated_content,
                source_type=baseline_data.get('source_type', 'manual'),
                source_ref=baseline_data.get('source_ref', 'manual'),
                created_at=baseline_data.get('created_at'),
                status=BaselineStatus.OK
            )
            result = generate_slides(baseline_hydrated, slide_count=slide_count)
            if isinstance(result.get('slide_plan'), str) and 'insufficient' in result['slide_plan'].lower():
                return jsonify({'error': 'Source text required. The material provided is too limited to generate slides.'}), 400
        
        export_data_list = [export_image(url, 'slides') for url in result['slide_image_urls']]
        # Build a lightweight prompt/analysis bundle for the slide deck.
        slide_plan = result.get('slide_plan', [])
        key_slides = [
            slide.get('title')
            for slide in slide_plan
            if isinstance(slide, dict) and slide.get('title')
        ]
        prompt = "\n\n".join(
            slide.get('image_prompt')
            for slide in slide_plan
            if isinstance(slide, dict) and slide.get('image_prompt')
        )
        analysis = {
            'title': f"Slide Deck: {baseline.source_ref or 'Generated'}",
            'key_facts': key_slides[:6],
            'statistics': [],
            'themes': baseline.themes[:4] if getattr(baseline, 'themes', None) else [],
            'narrative': {
                'opening': key_slides[0] if key_slides else '',
                'middle': key_slides[1:-1] if len(key_slides) > 2 else [],
                'closing': key_slides[-1] if len(key_slides) > 1 else ''
            },
            'sequence': [
                {
                    'index': idx + 1,
                    'title': slide.get('title', f"Slide {idx + 1}"),
                    'summary': " ".join((slide.get('bullets') or [])[:2])[:180],
                    'layout_hint': slide.get('type') or 'auto'
                }
                for idx, slide in enumerate(slide_plan)
                if isinstance(slide, dict)
            ]
        }

        return jsonify({
            'slide_plan': result['slide_plan'],
            'slide_image_urls': result['slide_image_urls'],
            'export_data': export_data_list,
            'prompt': prompt,
            'analysis': analysis
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/slides/powerpoint', methods=['POST'])
def slides_powerpoint():
    """Generate PowerPoint presentation from slides"""
    data = request.json
    baseline_data = data.get('baseline')

    try:
        from baseline import Baseline, BaselineStatus
        from clients.powerpoint_generator import create_presentation_from_slides
        import uuid

        baseline = Baseline(
            content=baseline_data['content'],
            source_type=baseline_data['source_type'],
            source_ref=baseline_data['source_ref'],
            created_at=baseline_data.get('created_at'),
            status=BaselineStatus(baseline_data.get('status', 'ok')),
            error_message=baseline_data.get('error_message')
        )

        # Check baseline status
        if baseline.status != BaselineStatus.OK:
            return jsonify({
                'error': baseline.error_message or 'Source text is insufficient for generation.'
            }), 400

        slide_count = data.get('slide_count', 6)
        result = generate_slides(baseline, slide_count=slide_count)

        # Check if renderer returned error message - hydrate and retry
        if isinstance(result.get('slide_plan'), str) and 'insufficient' in result['slide_plan'].lower():
            hydrated_content = fortify_input(baseline_data['content'], content_type='slides')
            baseline_hydrated = Baseline(
                content=hydrated_content,
                source_type=baseline_data['source_type'],
                source_ref=baseline_data['source_ref'],
                created_at=baseline_data.get('created_at'),
                status=BaselineStatus.OK
            )
            result = generate_slides(baseline_hydrated, slide_count=slide_count)
            if isinstance(result.get('slide_plan'), str) and 'insufficient' in result['slide_plan'].lower():
                return jsonify({'error': 'Source text required. The material provided is too limited to generate slides.'}), 400

        # Create PowerPoint from slide plan
        slide_plan = result.get('slide_plan', [])
        title = f"Presentation_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Optionally render SVG slide images into PNGs for PowerPoint
        image_mode = os.getenv('POWERPOINT_IMAGE_MODE', 'auto').strip().lower()
        slide_image_urls = result.get('slide_image_urls', [])
        image_paths = []
        if image_mode in ('svg', 'auto') and slide_image_urls:
            try:
                from clients.svg_to_png import svg_data_url_to_png_path
                tmp_dir = os.path.join('storage', 'exports', 'powerpoint', 'tmp')
                for idx, data_url in enumerate(slide_image_urls):
                    output_path = os.path.join(tmp_dir, f'slide_{idx + 1}.png')
                    image_paths.append(svg_data_url_to_png_path(data_url, output_path))
            except Exception as e:
                print(f"PowerPoint SVG conversion skipped: {e}")
                image_paths = []

        slides_for_ppt = slide_plan
        if image_paths and isinstance(slide_plan, list):
            slides_for_ppt = []
            for idx, slide in enumerate(slide_plan):
                if isinstance(slide, dict):
                    slide_with_image = dict(slide)
                    if idx < len(image_paths):
                        slide_with_image['image_path'] = image_paths[idx]
                    slides_for_ppt.append(slide_with_image)
                else:
                    slides_for_ppt.append(slide)

        # Generate PowerPoint
        filename = create_presentation_from_slides(slides_for_ppt, title=title)

        # Move to exports directory
        os.makedirs('storage/exports/powerpoint', exist_ok=True)
        export_path = os.path.join('storage/exports/powerpoint', os.path.basename(filename))
        if os.path.exists(filename):
            import shutil
            shutil.move(filename, export_path)

        # Clean up temporary images after export
        for path in image_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass

        return jsonify({
            'filename': os.path.basename(export_path),
            'path': export_path,
            'slide_count': len(slide_plan),
            'message': 'PowerPoint presentation generated successfully'
        })
    except Exception as e:
        print(f"PowerPoint generation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/powerpoint/<filename>')
def serve_powerpoint(filename):
    """Serve generated PowerPoint files"""
    ppt_dir = 'storage/exports/powerpoint'
    return send_from_directory(ppt_dir, filename, as_attachment=True)

@app.route('/image', methods=['GET'])
def image():
    prompt = request.args.get('prompt')
    model = request.args.get('model', 'flux')
    width = request.args.get('width', 1024, type=int)
    height = request.args.get('height', 1024, type=int)
    
    try:
        url = generate_image(prompt, model, width, height)
        return jsonify({'url': url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/image/auth', methods=['POST'])
def image_auth():
    data = request.json or {}
    prompt = data.get('prompt', '')
    if not prompt or not str(prompt).strip():
        return jsonify({'error': 'Prompt is required'}), 400

    api_key = os.getenv("POLLINATIONS_API_KEY")
    if not api_key:
        return jsonify({'error': 'POLLINATIONS_API_KEY not configured'}), 400

    model = data.get('model', 'flux')
    width = int(data.get('width', 1024))
    height = int(data.get('height', 1024))
    seed = data.get('seed', -1)
    enhance = data.get('enhance', False)
    negative_prompt = data.get('negative_prompt')

    import base64
    import urllib.parse
    import requests

    encoded_prompt = urllib.parse.quote(str(prompt))
    params = {
        'model': str(model),
        'width': str(width),
        'height': str(height),
        'seed': str(seed),
        'enhance': str(bool(enhance)).lower()
    }
    if negative_prompt:
        params['negative_prompt'] = str(negative_prompt)

    query = urllib.parse.urlencode(params)
    url = f"https://gen.pollinations.ai/image/{encoded_prompt}?{query}"

    try:
        response = requests.get(url, headers={'Authorization': f'Bearer {api_key}'}, timeout=60)
        if not response.ok:
            return jsonify({'error': f'Pollinations image generation failed: {response.status_code}'}), 502
        content_type = response.headers.get('Content-Type', 'image/png')
        encoded = base64.b64encode(response.content).decode()
        data_url = f"data:{content_type};base64,{encoded}"
        return jsonify({'data_url': data_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/audio/<filename>')
def serve_audio(filename):
    """Serve generated audio files."""
    audio_dir = 'storage/audio'
    return send_from_directory(audio_dir, filename)

@app.route('/tts', methods=['POST'])
def tts():
    data = request.json or {}
    text = data.get('text', '')
    prefix = data.get('prefix', 'narration')

    if not text or not text.strip():
        return jsonify({'error': 'Text is required for TTS.'}), 400

    try:
        tts_provider = get_tts_provider()
        audio_dir = 'storage/audio'
        os.makedirs(audio_dir, exist_ok=True)
        audio_filename = f"{prefix}_{uuid.uuid4().hex[:8]}.mp3"
        audio_path = os.path.join(audio_dir, audio_filename)
        tts_provider.synthesize(text, audio_path)
        return jsonify({'audio_filename': audio_filename})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/exports/<category>', methods=['GET'])
def list_exports(category):
    """List saved exports for a category."""
    try:
        files = list_saved(category)
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/codex', methods=['POST'])
def codex_proxy():
    """
    Text generation proxy supporting both OpenAI and Pollinations.
    Uses OpenAI if API key is available, otherwise falls back to Pollinations.
    """
    data = request.json or {}
    prompt = data.get('prompt', '')
    max_tokens = data.get('maxTokens', 1500)

    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    # Defensive truncation to avoid upstream limits
    MAX_PROMPT_OPENAI = 8000
    MAX_PROMPT_POLLINATIONS = 3000
    long_prompt = prompt
    prompt_for_openai = prompt if len(prompt) <= MAX_PROMPT_OPENAI else prompt[:MAX_PROMPT_OPENAI] + "... [truncated]"
    prompt_for_pollinations = prompt if len(prompt) <= MAX_PROMPT_POLLINATIONS else prompt[:MAX_PROMPT_POLLINATIONS] + "... [truncated]"

    # Try OpenAI first if API key is available
    if os.getenv('OPENAI_API_KEY'):
        try:
            from clients.openai_text import generate_text_with_retry
            text = generate_text_with_retry(
                prompt_for_openai,
                model=os.getenv('OPENAI_MODEL', 'gpt-4o-mini'),
                temperature=0.7,
                max_tokens=max_tokens,
                max_attempts=3
            )
            return jsonify({'text': text})
        except Exception as e:
            print(f"[Codex] OpenAI failed: {e}, falling back to Pollinations")

    # Fallback to Pollinations (has URL length limits for long prompts)
    try:
        text = generate_text(prompt_for_pollinations, max_tokens=max_tokens)
        return jsonify({'text': text})
    except Exception as e:
        fallback = f"Upstream text service unavailable. Error: {str(e)}"
        print(f"[Codex] Pollinations failed: {fallback}")
        return jsonify({'text': fallback, 'warning': 'fallback_text_due_to_upstream_failure'}), 200

@app.route('/api/pollinations', methods=['POST'])
def pollinations_proxy():
    """
    Pollinations text generation proxy.
    Handles long prompts by truncating to avoid URL length limits.
    """
    data = request.json or {}
    prompt = data.get('prompt', '')

    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    try:
        # Pollinations uses GET with URL encoding, so truncate long prompts
        if len(prompt) > 3000:
            print(f"[Pollinations] Truncating long prompt from {len(prompt)} to 3000 chars")
            prompt = prompt[:3000] + "... [truncated due to length]"

        text = generate_text(prompt)
        return jsonify({'text': text})
    except Exception as e:
        fallback = f"Pollinations text service unavailable. Error: {str(e)}"
        print(f"[Pollinations] failed: {fallback}")
        return jsonify({'text': fallback, 'warning': 'fallback_text_due_to_upstream_failure'}), 200

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for load balancers and monitoring."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0.0',
        'uptime_seconds': int(time.time() - app.start_time)
    }), 200

@app.route('/ready', methods=['GET'])
def ready():
    """Readiness check - verify dependencies are available."""
    import requests
    import shutil

    checks = {
        'pollinations_api': False,
        'disk_space': False,
        'storage_writable': False
    }

    # Check Pollinations API availability
    try:
        response = requests.get('https://text.pollinations.ai', timeout=5)
        checks['pollinations_api'] = response.status_code in [200, 405]  # 405 is OK, endpoint exists
    except:
        pass

    # Check disk space for audio storage (minimum 100MB free)
    try:
        stat = shutil.disk_usage('.')
        checks['disk_space'] = stat.free > 100 * 1024 * 1024
    except:
        pass

    # Check if storage directory is writable
    try:
        audio_dir = 'storage/audio'
        os.makedirs(audio_dir, exist_ok=True)
        test_file = os.path.join(audio_dir, '.writetest')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        checks['storage_writable'] = True
    except:
        pass

    all_ready = all(checks.values())
    return jsonify({
        'ready': all_ready,
        'checks': checks,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if all_ready else 503

@app.route('/metrics', methods=['GET'])
def metrics():
    """Basic metrics endpoint for monitoring."""
    return jsonify({
        'uptime_seconds': int(time.time() - app.start_time),
        'image_provider': os.getenv('INFOGRAPHIC_IMAGE_PROVIDER', 'pollinations'),
        'cache_ttl': int(os.getenv('CACHE_TTL', 3600)),
        'timestamp': datetime.utcnow().isoformat()
    }), 200

@app.route('/storage/exports/<path:filename>')
def serve_export(filename):
    """Serve exported files (infographics, slides, etc)."""
    return send_from_directory('storage/exports', filename)

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'

    print("\n" + "="*60)
    print(' Learning Studio Builder Server Starting')
    print("="*60)
    print(f"Backend Port: {port}")
    print(f"Debug Mode: {debug}")
    print(f"Image Provider: {os.getenv('INFOGRAPHIC_IMAGE_PROVIDER', 'pollinations')}")
    print(f"CORS Origins: {', '.join(allowed_origins)}")
    print("="*60)
    print("\n📌 IMPORTANT: Backend API runs on http://localhost:{port}")
    print("🌐 Open your BROWSER at: http://localhost:3002")
    print("   (Frontend dev server must be running with: npm run dev)\n")
    print("="*60 + "\n")

    app.run(host='0.0.0.0', port=port, debug=debug)
