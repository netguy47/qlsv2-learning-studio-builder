export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function trimAndSanitize(input: string): string {
  return (input || '').replace(/\r/g, '').trim();
}

export function sanitize(input?: string): string {
  return trimAndSanitize(input || '');
}
