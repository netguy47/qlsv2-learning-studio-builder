type PollinationsImageOptions = {
  width?: number;
  height?: number;
  seed?: number;
  enhance?: boolean;
  safe?: boolean;
  model?: 'flux' | 'seedream' | 'nano-banana' | 'gpt-image';
};

export function generateFluxImage(prompt: string, options: PollinationsImageOptions = {}) {
  const {
    width = 1024,
    height = 1024,
    seed = -1,
    enhance = false,
    safe = false,
    model = 'flux'
  } = options;

  const params = new URLSearchParams({
    model,
    width: width.toString(),
    height: height.toString(),
    seed: seed.toString(),
    enhance: enhance.toString(),
    safe: safe.toString()
  });

  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
}
