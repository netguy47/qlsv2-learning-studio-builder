export async function codexGenerate(prompt: string, maxTokens = 1500): Promise<string> {
  const res = await fetch('/api/codex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Codex proxy error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.text || '';
}

export async function zchatGenerate(prompt: string, maxTokens = 1500): Promise<string> {
  const res = await fetch('/api/zchat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'glm-4.7',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.0,
      maxTokens
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ZChat proxy error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.text || '';
}

export async function pollinationsFallback(prompt: string): Promise<string> {
  const res = await fetch('/api/pollinations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model: 'openai', maxTokens: 1500, temperature: 0.7 })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pollinations error ${res.status}: ${text}`);
  }
  const data = await res.json();
  if (!data.text) {
    throw new Error('Pollinations returned empty content.');
  }
  return data.text;
}
