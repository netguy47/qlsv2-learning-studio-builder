import { API_ENDPOINTS } from '../config';

export const pollinationsService = {
  generateImage: async (prompt: string, options: any = {}) => {
    const { width = 1280, height = 720, model = 'flux' } = options;
    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      model: model
    });
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
  },

  generateInfographicAsset: async (data: any, assetType: string) => {
    const prompt = `Infographic ${assetType}: ${data.title || 'visualization'}`;
    return pollinationsService.generateImage(prompt, {
      width: data.width || 1920,
      height: data.height || 400
    });
  },

  generateSlideAsset: async (slideData: any, options: any = {}) => {
    const prompt = `Slide: ${slideData.concept}. ${slideData.keyPoints?.join(', ')}`;
    return pollinationsService.generateImage(prompt, {
      width: 1920,
      height: 1080,
      model: 'flux'
    });
  },

  generateAudio: async (text: string, options: any = {}) => {
    const { prefix = 'slide' } = options;
    const response = await fetch(API_ENDPOINTS.TTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, prefix })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS request failed: ${errorText}`);
    }
    const data = await response.json();
    if (!data.audio_filename) {
      throw new Error('TTS response missing audio filename.');
    }
    return `${API_ENDPOINTS.AUDIO}/${data.audio_filename}`;
  },

  batchGenerate: async (requests: any[]) => {
    const results = await Promise.allSettled(
      requests.map(req => {
        if (req.type === 'infographic') {
          return pollinationsService.generateInfographicAsset(req.data, req.assetType);
        } else if (req.type === 'slide') {
          return pollinationsService.generateSlideAsset(req.slideData, req.options);
        } else if (req.type === 'audio') {
          return pollinationsService.generateAudio(req.text, req.options);
        } else if (req.type === 'image') {
          return pollinationsService.generateImage(req.prompt, req.options);
        }
        return Promise.resolve(null);
      })
    );

    return results.map((result, i) => ({
      id: requests[i].id,
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null
    }));
  }
};

export default pollinationsService;
