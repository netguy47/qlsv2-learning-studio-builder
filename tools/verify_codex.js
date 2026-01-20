async function run() {
  const prompt = 'Verification test: return a single paragraph confirming proxy works.';
  console.log('VERIFY START:', new Date().toISOString());
  try {
    const res = await fetch('http://localhost:3001/api/codex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens: 120 })
    });
    console.log('PROXY STATUS:', res.status);
    const text = await res.text();
    console.log('RAW RESPONSE LENGTH:', text.length);
    console.log('RAW RESPONSE PREVIEW:', text.slice(0, 500));
  } catch (err) {
    console.error('VERIFY ERROR:', err);
  }
  console.log('VERIFY END:', new Date().toISOString());
}

run();
