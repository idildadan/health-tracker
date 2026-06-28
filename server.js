import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4173

// Open Food Facts'e server-side proxy.
// CORS sorununu çözer + OFF'un Cloudflare WAF'ında bot olarak işaretlenmemek için
// browser benzeri header'lar gönderiyoruz, ayrıca v2 503 verirse search-a-licious'a düşüyoruz.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  Referer: 'https://world.openfoodfacts.org/',
}

async function tryV2(query) {
  const params = new URLSearchParams({
    search_terms: query,
    page_size: '15',
    lc: 'tr',
    fields: 'product_name,product_name_tr,brands,nutriments',
  })
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/search?${params}`, {
    headers: BROWSER_HEADERS,
  })
  if (!res.ok) throw new Error(`v2 ${res.status}`)
  return await res.json()
}

async function trySearchALicious(query) {
  // search-a-licious yeni nesil OFF arama API'si, farklı altyapıda
  const params = new URLSearchParams({
    q: query,
    page_size: '15',
    langs: 'tr,en',
    fields: 'product_name,product_name_tr,brands,nutriments',
  })
  const res = await fetch(`https://search.openfoodfacts.org/search?${params}`, {
    headers: BROWSER_HEADERS,
  })
  if (!res.ok) throw new Error(`search-a-licious ${res.status}`)
  const data = await res.json()
  // search-a-licious response formatını v2 formatına dönüştür (hits → products)
  return { products: data.hits || [] }
}

app.get('/api/off-search', async (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) {
    return res.status(400).json({ error: 'q parametresi gerekli' })
  }

  const errors = []
  for (const [name, fn] of [
    ['v2', tryV2],
    ['search-a-licious', trySearchALicious],
  ]) {
    try {
      const data = await fn(query)
      res.set('Cache-Control', 'public, max-age=300')
      return res.json(data)
    } catch (err) {
      errors.push(`${name}: ${err.message}`)
      console.error(`OFF ${name} hatası:`, err.message)
    }
  }
  res.status(502).json({ error: `Tüm endpointler başarısız: ${errors.join(' | ')}` })
})

// Static dist klasörünü servis et + SPA fallback
const distDir = join(__dirname, 'dist')
app.use(express.static(distDir))
app.get(/.*/, (_req, res) => {
  res.sendFile(join(distDir, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`health-tracker server :${PORT}`)
})
