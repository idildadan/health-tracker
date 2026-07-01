// Claude ile doğal dil öğün ayrıştırma. Ortak backend'in /api/health/ai-meal ucuna gider;
// API key yalnızca backend'de (lib/llm.js). api() base URL + Bearer token ekler.
import { api } from './api/client'

export async function parseMealWithAI(text, signal) {
  return api('/api/health/ai-meal', { method: 'POST', body: { text }, signal })
}
