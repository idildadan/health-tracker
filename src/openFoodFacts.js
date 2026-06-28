// Tarayıcıdan Open Food Facts'e doğrudan istek atmıyoruz; kendi backend proxy'mize
// (/api/off-search) atıyoruz. Bu sayede CORS sorunu yaşamıyoruz ve OFF'un anonim
// kullanıcılara verdiği 503 engelinden de muafız.
const PROXY_ENDPOINT = '/api/off-search'

export async function searchOpenFoodFacts(query, signal) {
  const params = new URLSearchParams({ q: query })

  let res
  try {
    res = await fetch(`${PROXY_ENDPOINT}?${params}`, { signal })
  } catch (err) {
    throw new Error(`Ağ isteği başarısız: ${err.message}`)
  }

  if (!res.ok) {
    throw new Error(`Arama başarısız (${res.status})`)
  }

  const data = await res.json()

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
