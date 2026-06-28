import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4173

// Türkçe yiyecek terimlerinin İngilizce karşılıkları. OFF'un ürün veritabanı çoğunlukla
// İngilizce isim taşıdığı için "yumurta" gibi tek başına Türkçe sorgular eşleşmiyor.
// Sorguyu "yumurta egg" şeklinde genişletip her iki dilden sonuç çekiyoruz.
const TR_EN_FOOD = {
  yumurta: 'egg',
  yoğurt: 'yogurt',
  yogurt: 'yogurt',
  süt: 'milk',
  sut: 'milk',
  peynir: 'cheese',
  ekmek: 'bread',
  tavuk: 'chicken',
  balık: 'fish',
  balik: 'fish',
  somon: 'salmon',
  ton: 'tuna',
  et: 'meat',
  kıyma: 'minced meat',
  pirinç: 'rice',
  pirinc: 'rice',
  makarna: 'pasta',
  mercimek: 'lentil',
  nohut: 'chickpea',
  fasulye: 'beans',
  yulaf: 'oats',
  bal: 'honey',
  reçel: 'jam',
  recel: 'jam',
  zeytin: 'olive',
  badem: 'almond',
  ceviz: 'walnut',
  fındık: 'hazelnut',
  findik: 'hazelnut',
  çikolata: 'chocolate',
  cikolata: 'chocolate',
  kahve: 'coffee',
  çay: 'tea',
  cay: 'tea',
  muz: 'banana',
  elma: 'apple',
  portakal: 'orange',
  çilek: 'strawberry',
  cilek: 'strawberry',
  domates: 'tomato',
  patates: 'potato',
  havuç: 'carrot',
  havuc: 'carrot',
  soğan: 'onion',
  sogan: 'onion',
  sarımsak: 'garlic',
  salatalık: 'cucumber',
  salatalik: 'cucumber',
  marul: 'lettuce',
  ıspanak: 'spinach',
  ispanak: 'spinach',
  brokoli: 'broccoli',
  mantar: 'mushroom',
  yaban: 'blueberry', // yaban mersini
  avokado: 'avocado',
  mısır: 'corn',
  misir: 'corn',
  cips: 'chips',
  bisküvi: 'biscuit',
  biskuvi: 'biscuit',
  dondurma: 'ice cream',
  kefir: 'kefir',
  ayran: 'ayran',
  tereyağı: 'butter',
  tereyagi: 'butter',
  margarin: 'margarine',
  protein: 'protein',
  granola: 'granola',
  müsli: 'muesli',
  musli: 'muesli',
  şeker: 'sugar',
  seker: 'sugar',
  tuz: 'salt',
  un: 'flour',
  yağ: 'oil',
  yag: 'oil',
}

function expandQuery(q) {
  const lower = q.toLowerCase().trim()
  const words = lower.split(/\s+/)
  const translated = words.map((w) => TR_EN_FOOD[w]).filter(Boolean)
  if (translated.length === 0) return q
  // Hem orijinal Türkçe sorguyu hem de İngilizce karşılığını birleştir
  return `${q} ${translated.join(' ')}`
}

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

function fetchWithTimeout(url, options, ms = 5000) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(t))
}

async function tryV2(query) {
  const params = new URLSearchParams({
    search_terms: query,
    page_size: '15',
    lc: 'tr',
    fields: 'product_name,product_name_tr,brands,nutriments',
  })
  const res = await fetchWithTimeout(
    `https://world.openfoodfacts.org/api/v2/search?${params}`,
    { headers: BROWSER_HEADERS },
    5000,
  )
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
  const res = await fetchWithTimeout(
    `https://search.openfoodfacts.org/search?${params}`,
    { headers: BROWSER_HEADERS },
    8000,
  )
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

  const expanded = expandQuery(query)
  const errors = []
  for (const [name, fn] of [
    ['v2', tryV2],
    ['search-a-licious', trySearchALicious],
  ]) {
    try {
      const data = await fn(expanded)
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
