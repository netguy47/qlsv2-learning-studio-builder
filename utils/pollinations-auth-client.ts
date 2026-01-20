import { API_ENDPOINTS } from '../config';

type PollinationsAuthOptions = {
  width?: number;
  height?: number;
  seed?: number;
  enhance?: boolean;
  negative_prompt?: string;
  model?: 'flux' | 'seedream' | 'nano-banana' | 'gpt-image';
};

export async function generateFluxImageAuth(
  prompt: string,
  options: PollinationsAuthOptions = {}
) {
  const response = await fetch(`${API_ENDPOINTS.IMAGE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...options })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flux generation failed: ${errorText}`);
  }

  const data = await response.json();
  if (!data.data_url) {
    throw new Error('Flux generation failed: missing data_url.');
  }

  return data.data_url as string;
}
