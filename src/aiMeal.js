// Claude (server-side) ile doğal dil öğün ayrıştırma.
// İstek server'daki /api/ai-meal endpoint'ine gider, API key sadece backend'de tutulur.
export async function parseMealWithAI(text, signal) {
  const res = await fetch('/api/ai-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Hata: HTTP ${res.status}`)
  }
  return await res.json()
}
