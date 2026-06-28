const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/search'

export async function searchOpenFoodFacts(query, signal) {
  const params = new URLSearchParams({
    search_terms: query,
    page_size: '10',
    lc: 'tr', // ürün adlarının Türkçe çevirisi varsa onu döndür
    fields: 'product_name,product_name_tr,brands,nutriments',
  })

  let res
  try {
    res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal })
  } catch (err) {
    throw new Error(`Ağ isteği başarısız: ${err.message}`)
  }

  if (!res.ok) {
    throw new Error(`Open Food Facts ${res.status} döndürdü`)
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
