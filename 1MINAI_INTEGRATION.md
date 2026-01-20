# 1min.ai API Integration - Phase 1 Complete

## Overview
Phase 1 of the 1min.ai API integration has been successfully implemented. This integration provides enhanced audio capabilities, music generation, and image enhancement features to the Learning Studio Builder application.

## What's Been Implemented

### 1. ElevenLabs TTS Integration
**File:** `tts/oneminai_provider.py`

Replaces basic gTTS with high-quality ElevenLabs text-to-speech.

**Features:**
- Multiple voice models (eleven_multilingual_v2, eleven_turbo_v2, etc.)
- Adjustable speech speed (0.25 to 4.0)
- MP3 output format
- Support for multiple languages

**Voices Available:**
- eleven_multilingual_v2 (default)
- eleven_turbo_v2
- eleven_monolingual_v1
- rachel, drew, clyde, sarah, adam, fin

### 2. Music Generation
**File:** `tts/oneminai_music_generator.py`

Generate background music for podcasts and presentations.

**Features:**
- Multiple music models (Udio, Suno, MusicGen, Lyria)
- Customizable duration
- Style-based generation
- Pre-configured podcast background music

**Models Available:**
- udio (recommended for podcasts)
- suno
- musicgen
- lyria

### 3. Image Enhancement
**File:** `services/oneminai_image_service.py`

Enhance image generation with variations and prompt optimization.

**Features:**
- Generate multiple image variations (1-4)
- Image-to-prompt conversion
- Prompt enhancement with AI
- Reference image support

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# 1min.ai API Key
ONE_MIN_AI_API_KEY=your_1minai_api_key_here

# TTS Provider Selection
# Options: gtts, oneminai
TTS_PROVIDER=oneminai
```

### API Key Setup

1. Sign up at [1min.ai](https://1min.ai)
2. Create an API key in your account settings
3. Add the key to your `.env` file

## Usage

### Using ElevenLabs TTS

```python
from tts import get_tts_provider

# Get the 1min.ai provider
provider = get_tts_provider()

# Generate speech
provider.synthesize(
    text="Hello, this is a test.",
    output_path="output.mp3",
    voice="eleven_multilingual_v2",
    speed=1.0
)
```

### Using Music Generation

```python
from tts.oneminai_music_generator import OneMinAIMusicGenerator

generator = OneMinAIMusicGenerator()

# Generate podcast background music
generator.generate_podcast_background(
    output_path="background_music.mp3",
    duration=30
)

# Generate custom music
generator.generate_music(
    prompt="Calm, ambient music for presentation",
    output_path="custom_music.mp3",
    model="udio",
    duration=45
)
```

### Using Image Enhancement

```python
from services.oneminai_image_service import OneMinAIImageEnhancer

enhancer = OneMinAIImageEnhancer()

# Generate image variations
variations = enhancer.generate_variations(
    image_url="https://example.com/image.jpg",
    num_variations=3
)

# Convert image to prompt
prompt = enhancer.image_to_prompt(
    image_url="https://example.com/image.jpg"
)

# Enhance prompt
enhanced_prompt = enhancer.enhance_image_prompt(
    original_prompt="A beautiful landscape",
    image_url="https://example.com/reference.jpg"
)
```

## Testing

Run the integration test:

```bash
python test_1minai_integration.py
```

This will test:
- ElevenLabs TTS
- Music Generation
- Image Variator
- Image to Prompt

## Switching Between Providers

To switch between gTTS and 1min.ai:

```bash
# Use gTTS (default)
TTS_PROVIDER=gtts

# Use 1min.ai ElevenLabs
TTS_PROVIDER=oneminai
```

## Benefits

### Audio Quality
- **Before:** Basic gTTS with limited voice options
- **After:** Professional-grade ElevenLabs voices with multiple languages and emotions

### Podcast Production
- **Before:** Plain speech narration
- **After:** Professional podcasts with background music and high-quality narration

### Image Generation
- **Before:** Single image generation
- **After:** Multiple variations, prompt optimization, and AI-enhanced descriptions

## Next Steps (Phase 2)

Future enhancements could include:
1. Video generation from slides
2. Content enhancement tools (expander, paraphraser, summarizer)
3. Voice cloning for custom narrator voices
4. Speech-to-text for transcription
5. Audio translation for multi-language support

## Troubleshooting

### API Key Not Found
```
Error: ONE_MIN_AI_API_KEY environment variable is required
```
**Solution:** Add your 1min.ai API key to the `.env` file

### Rate Limit Exceeded
```
Error: 1min.ai TTS request failed: 429 Too Many Requests
```
**Solution:** Wait a few seconds before retrying. Rate limit is 180 requests/minute.

### Invalid Voice Model
```
Error: Invalid voice model specified
```
**Solution:** Use one of the available voices listed in the documentation

## Cost Considerations

1min.ai uses a credit-based system. Check your account for:
- Available credits
- Cost per API call
- Rate limits (180 requests/minute default)

## Documentation Links

- [1min.ai API Documentation](https://docs.1min.ai/docs/api/intro)
- [ElevenLabs TTS](https://docs.1min.ai/docs/api/ai-for-audio/text-to-speech/elevenlabs)
- [Music Generator](https://docs.1min.ai/docs/api/ai-for-audio/music-generator/music-generator-tag)
- [Image Variator](https://docs.1min.ai/docs/api/ai-for-image/image-variator/image-variator-tag)

## Support

For issues with:
- **API Keys:** Contact 1min.ai support
- **Integration:** Check test output and logs
- **Configuration:** Verify environment variables

---

**Version:** 1.0.0  
**Date:** 2026-01-19  
**Status:** Phase 1 Complete ✅
