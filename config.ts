/**
 * Configuration module for API endpoints and environment-specific settings
 */

export const getApiBaseUrl = (): string => {
  // Use relative URLs for proxy (both dev and production)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  PREVIEW: `${API_BASE_URL}/preview`,
  INGEST: `${API_BASE_URL}/ingest`,
  REPORT: `${API_BASE_URL}/api/codex`,
  PODCAST: `${API_BASE_URL}/api/codex`,
  INFOGRAPHIC: `${API_BASE_URL}/infographic`,
  SLIDES: `${API_BASE_URL}/slides`,
  TTS: `${API_BASE_URL}/tts`,
  IMAGE: `${API_BASE_URL}/image`,
  AUDIO: `${API_BASE_URL}/audio`,
  EXPORTS: `${API_BASE_URL}/exports`,
  CODEX: `${API_BASE_URL}/api/codex`,
  POLLINATIONS: `${API_BASE_URL}/api/pollinations`,
  HEALTH: `${API_BASE_URL}/health`,
  READY: `${API_BASE_URL}/ready`,
  METRICS: `${API_BASE_URL}/metrics`
} as const;

export const TIMEOUTS = {
  DEFAULT: 30000,      // 30 seconds
  INFOGRAPHIC: 30000,  // 30 seconds (single image)
  SLIDES: 90000,       // 90 seconds (multiple images)
  LONGFORM: 60000,     // 60 seconds (text generation)
  TTS: 45000          // 45 seconds (audio generation)
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 500,
  MAX_DELAY: 5000
} as const;
