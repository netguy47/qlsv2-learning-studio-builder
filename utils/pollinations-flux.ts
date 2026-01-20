import { FLUX_PROMPT_TEMPLATES } from './flux-prompt-templates';
import { generateFluxImageAuth } from './pollinations-auth-client';
import { PollenTracker } from './pollen-tracker';

type FluxVisual = {
  label: string;
  imageUrl: string;
};

type SlidePlan = {
  title?: string;
  bullets?: string[];
  notes?: string;
};

const tracker = new PollenTracker();

const baseOptions = {
  width: 1024,
  height: 768,
  enhance: true
};

export async function generateInfographicFluxVisuals(
  analysis: any,
  theme: string
): Promise<FluxVisual[]> {
  if (!analysis) return [];

  const visuals: { label: string; prompt: string }[] = [];
  const title = analysis.title || 'Infographic';
  visuals.push({
    label: 'Header',
    prompt: `${FLUX_PROMPT_TEMPLATES.header(title)} Theme: ${theme}`
  });

  if (Array.isArray(analysis.statistics) && analysis.statistics.length > 0) {
    visuals.push({
      label: 'Chart',
      prompt: `${FLUX_PROMPT_TEMPLATES.barChart(analysis.statistics)} Theme: ${theme}`
    });
  }

  if (Array.isArray(analysis.themes) && analysis.themes.length > 0) {
    analysis.themes.slice(0, 2).forEach((themeLabel: string) => {
      visuals.push({
        label: `Icon: ${themeLabel}`,
        prompt: `${FLUX_PROMPT_TEMPLATES.icon(themeLabel)} Theme: ${theme}`
      });
    });
  }

  const prompts = visuals.map((v) => v.prompt);
  const urls = await Promise.all(
    prompts.map((prompt, index) =>
      generateFluxImageAuth(prompt, {
        ...baseOptions,
        seed: index
      })
    )
  );
  tracker.trackGeneration(urls.length);

  return visuals.map((v, i) => ({
    label: v.label,
    imageUrl: urls[i]
  }));
}

export async function generateSlideDeckFluxVisuals(
  slidePlan: SlidePlan[],
  theme: string
): Promise<FluxVisual[]> {
  if (!Array.isArray(slidePlan) || slidePlan.length === 0) return [];

  const prompts = slidePlan.map((slide, index) => {
    const title = slide.title || `Slide ${index + 1}`;
    const bullets = Array.isArray(slide.bullets) ? slide.bullets.slice(0, 4) : [];
    const summary = bullets.join('  ');
    return `
      Modern educational slide background,
      bold headline "${title}",
      ${summary},
      clean layout, strong hierarchy,
      high contrast text, vibrant teal and green accents,
      professional academic style,
      Theme: ${theme}
    `.trim();
  });

  const urls = await Promise.all(
    prompts.map((prompt, index) =>
      generateFluxImageAuth(prompt, {
        width: 1280,
        height: 720,
        enhance: true,
        seed: index
      })
    )
  );
  tracker.trackGeneration(urls.length);

  return slidePlan.map((slide, index) => ({
    label: slide.title || `Slide ${index + 1}`,
    imageUrl: urls[index]
  }));
}
