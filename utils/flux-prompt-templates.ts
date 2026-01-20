export const FLUX_PROMPT_TEMPLATES = {
  header: (title: string) => `
    Professional infographic header banner,
    bold white text "${title}",
    gradient background blue to cyan,
    modern corporate style,
    clean typography, high contrast,
    centered composition
  `,

  barChart: (data: Array<{ label: string; value: number | string }>) => `
    Clean professional bar chart infographic,
    ${data.map((d) => `${d.label}: ${d.value}`).join(', ')},
    labeled axes, grid lines, modern color palette,
    data labels on top of bars, white background,
    corporate presentation style
  `,

  icon: (concept: string) => `
    Simple flat icon representing ${concept},
    minimalist design, single accent color,
    white background, vector style,
    centered composition, professional
  `,

  timeline: (events: Array<{ date: string; event: string }>) => `
    Horizontal timeline infographic,
    ${events.map((e) => `${e.date}: ${e.event}`).join(', ')},
    milestone markers, connecting line,
    chronological left to right, clean design,
    modern corporate style
  `,

  process: (steps: string[]) => `
    Flowchart diagram showing process:
    ${steps.join('  ')},
    connected boxes with arrows,
    clear labels, professional style,
    organized horizontal layout
  `
};
