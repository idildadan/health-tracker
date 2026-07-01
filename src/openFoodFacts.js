// Open Food Facts araması artık ortak backend proxy'sine gider: /api/health/off-search
// (Bearer token'la korunur). api() base URL + Authorization header'ı ekler.
import { api } from './api/client'

export async function searchOpenFoodFacts(query, signal) {
  const params = new URLSearchParams({ q: query })
  const data = await api(`/api/health/off-search?${params}`, { signal })

  return (data.products || [])
    .map((p) => ({ ...p, name: p.product_name_tr || p.product_name }))
    .filter((p) => p.name && p.nutriments?.['energy-kcal_100g'] != null)
    .map((p, i) => ({
      id: `off-${i}-${p.name}`,
      name: p.brands ? `${p.name} (${p.brands})` : p.name,
      kcal100: p.nutriments['energy-kcal_100g'],
      protein100: p.nutriments.proteins_100g || 0,
      unit: { label: '100g', grams: 100 },
      source: 'online',
    }))
}
