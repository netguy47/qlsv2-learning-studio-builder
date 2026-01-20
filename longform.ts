import { countWords as baseCountWords, sanitize } from './utils';
import { codexGenerate, pollinationsFallback, zchatGenerate } from './providers';

type Provider = 'codex' | 'pollinations' | 'zchat';

export async function generateLongForm(
  sourceText: string,
  mode: 'article' | 'podcast',
  opts?: { minWords?: number; provider?: Provider; maxAttempts?: number; maxTokens?: number; shouldHydrate?: boolean }
): Promise<string> {
  const minWords = opts?.shouldHydrate ? 10 : (opts?.minWords ?? (mode === 'article' ? 1500 : 800));
  const provider = opts?.provider ?? 'codex';
  const maxAttempts = opts?.maxAttempts ?? 8;
  const maxTokens = opts?.maxTokens ?? 1500;

  const source = sanitize(sourceText);
  if (!source || source.length < 50) {
    throw new Error('Source text missing or too short for generation.');
  }

  const systemRule =
    mode === 'podcast'
      ? `
You are an audio-first content generation system producing publish-ready podcast dialogue.

FORMAT RULES (MANDATORY)
Output must be dialogue only
Two hosts only:
Host 1: Maya
Host 2: Alex
Write in natural conversational turns
No stage directions of any kind
(no music cues, no sound notes, no parentheticals, no production markers)
No headings, no bullet points, no narration labels beyond speaker names

TONE & STYLE
Calm, analytical, and conversational
Curious but skeptical
No sensationalism
No moralizing
No certainty beyond evidence
Language suitable for a serious current-affairs podcast
Dialogue should sound like:
Two informed journalists thinking out loud together
not reading a script, not debating theatrically

CONTENT CONSTRAINTS
Do not invent facts
Clearly separate:
verified information
plausible explanations
speculation
When evidence is weak or missing, say so plainly
Prefer known mechanisms over exotic explanations unless evidence demands otherwise
Treat viral claims with skepticism, not ridicule

STRUCTURAL FLOW (IMPLICIT DO NOT LABEL)
Each episode should naturally progress through:
What is being claimed
What is actually known
Where the claim originated
Technical, scientific, or medical realities
Alternative explanations
Why confusion spread
What conclusions are justified right now

EXPERT USE
Experts may be referenced or quoted
Quotes must be framed as expert commentary, not definitive proof
Avoid appeals to authority; emphasize reasoning

PROHIBITIONS
No directions like music fades, pause, cue, etc.
No host monologues longer than ~20-25 seconds of spoken audio
No absolute conclusions unless supported by strong, independent evidence
No emotional manipulation language

SUCCESS CRITERIA
A listener should feel:
Informed, not inflamed
Oriented, not overwhelmed
Confident about what is known vs. unknown
The output must be immediately recordable without editing.
`
      : `
You are a helpful assistant. Produce a detailed article of at least ${minWords} words.
Do not restart the content; continue from where you left off if asked to continue.
If you finish before ${minWords} words, continue writing until the minimum is reached.
`;
  const userPrompt = `
Topic and source:
${source}

Instructions:
Write a ${mode === 'article' ? 'structured article' : 'podcast script'} of at least ${minWords} words.
Include sections, examples, and transitions. Do not stop early.
`;

  let output = '';
  let attempts = 0;

  try {
    output = await callProvider(provider, systemRule + userPrompt, maxTokens);
  } catch (err) {
    if (provider === 'codex') {
      try {
        output = await pollinationsFallback(systemRule + userPrompt);
      } catch (fallbackErr) {
        throw new Error(`Initial generation failed: ${String(err)}; fallback failed: ${String(fallbackErr)}`);
      }
    } else {
      throw err;
    }
  }

  if (countWords(output) === 0) {
    throw new Error('Initial generation returned empty output.');
  }

  while (countWords(output) < minWords && attempts < maxAttempts) {
    attempts += 1;
    const lastChunk = output.slice(-1200);
    const continuePrompt = `
Continue the previous content. You have produced ${countWords(output)} words so far.
Do not restart. Continue from where you left off and expand until you reach at least ${minWords} words.
Context (last part of previous output):
${lastChunk}
`;
    let continuation = '';
    try {
      continuation = await callProvider(provider, systemRule + continuePrompt, maxTokens);
    } catch (err) {
      if (provider === 'codex') {
        try {
          continuation = await pollinationsFallback(systemRule + continuePrompt);
        } catch {
          break;
        }
      } else {
        break;
      }
    }

    if (!continuation || continuation.trim().length === 0) {
      break;
    }

    output += `\n\n${continuation}`;
  }

  if (mode === 'podcast') {
    output = enforcePodcastTurns(output);
  }

  if (!opts?.shouldHydrate && countWords(output) < minWords) {
    throw new Error(`Unable to reach minimum word count after ${attempts} attempts. Produced ${countWords(output)} words.`);
  }

  return output;
}

function enforcePodcastTurns(text: string): string {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const cleaned: string[] = [];
  for (const line of lines) {
    if (line.startsWith('Maya:') || line.startsWith('Alex:')) {
      cleaned.push(line);
    }
  }
  if (cleaned.length === 0) {
    return text;
  }
  const normalized: string[] = [];
  let lastSpeaker: 'Maya' | 'Alex' | null = null;
  for (const line of cleaned) {
    const speaker = line.startsWith('Maya:') ? 'Maya' : 'Alex';
    if (speaker === lastSpeaker) {
      const target = speaker === 'Maya' ? 'Alex' : 'Maya';
      normalized.push(`${target}: ${line.replace(/^Maya:\s*|^Alex:\s*/i, '')}`);
      lastSpeaker = target;
    } else {
      normalized.push(line);
      lastSpeaker = speaker;
    }
  }
  return normalized.join('\n');
}

export function countWords(text?: string): number {
  return baseCountWords(text || '');
}

async function callProvider(provider: Provider, prompt: string, maxTokens = 1500) {
  const preview = prompt.slice(0, 200).replace(/\s+/g, ' ').trim();
  console.log('Provider:', provider, 'Prompt preview:', preview);
  if (provider === 'codex') return codexGenerate(prompt, maxTokens);
  if (provider === 'zchat') return zchatGenerate(prompt, maxTokens);
  return pollinationsFallback(prompt);
}
