import { generateFluxImage } from './pollinations-client';

type FluxOptions = {
  width?: number;
  height?: number;
  seed?: number;
  enhance?: boolean;
  safe?: boolean;
  model?: 'flux' | 'seedream' | 'nano-banana' | 'gpt-image';
};

export async function batchGenerateFlux(prompts: string[], options: FluxOptions = {}) {
  const batchSize = 10;
  const batches: string[][] = [];

  for (let i = 0; i < prompts.length; i += batchSize) {
    batches.push(prompts.slice(i, i + batchSize));
  }

  const results: string[] = [];
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map((prompt) => generateFluxImage(prompt, options))
    );
    results.push(...batchResults);
  }

  return results;
}

export async function generateVariations(prompt: string, count = 5) {
  const variations = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      generateFluxImage(prompt, {
        seed: i,
        enhance: true
      })
    )
  );

  return variations;
}
