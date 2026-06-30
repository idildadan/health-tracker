import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '64kb' }))
const PORT = process.env.PORT || 4173

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

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

// AI ile öğün ayrıştırma — kullanıcının doğal dil öğün açıklamasını alır,
// Claude Haiku'ya tool use ile yollar, structured JSON döner.
const MEAL_TOOL = {
  name: 'submit_meal_breakdown',
  description: 'Kullanıcının öğün açıklamasını yiyecek kalemlerine ayır ve her biri için kalori/protein tahmini ver',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Yiyeceğin Türkçe ismi (örn. "Yumurta (haşlanmış)", "Tam buğday ekmeği")' },
            grams: { type: 'number', description: 'Tahmini ağırlık gram cinsinden; bilinmiyorsa porsiyon ortalamasını kullan' },
            calories: { type: 'number', description: 'Toplam kalori (kcal), porsiyon için' },
            protein: { type: 'number', description: 'Toplam protein gramı, porsiyon için' },
          },
          required: ['name', 'calories', 'protein'],
        },
      },
      notes: {
        type: 'string',
        description: 'Varsa kısa bir varsayım notu (örn. "Yumurta haşlanmış kabul edildi"). Boş bırakılabilir.',
      },
    },
    required: ['items'],
  },
}

app.post('/api/ai-meal', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY tanımlı değil' })
  }
  const text = String(req.body?.text || '').trim()
  if (!text) {
    return res.status(400).json({ error: 'text alanı gerekli' })
  }
  if (text.length > 1000) {
    return res.status(400).json({ error: 'text çok uzun (max 1000 karakter)' })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [MEAL_TOOL],
      tool_choice: { type: 'tool', name: 'submit_meal_breakdown' },
      messages: [
        {
          role: 'user',
          content: `Aşağıdaki öğün açıklamasını yiyecek kalemlerine ayır ve her biri için makul kalori (kcal) ve protein (gram) tahmini ver. Türk mutfağı ve yaygın porsiyon ölçülerini bil. Belirtilen adet/porsiyon yoksa makul bir varsayım yap. Sadece tool çağrısıyla yanıt ver.\n\nÖğün: ${text}`,
        },
      ],
    })

    const toolUse = message.content.find((c) => c.type === 'tool_use')
    if (!toolUse) {
      return res.status(502).json({ error: 'Model tool çağrısı yapmadı' })
    }
    res.json(toolUse.input)
  } catch (err) {
    console.error('AI öğün hatası:', err)
    res.status(502).json({ error: `AI çağrısı başarısız: ${err.message}` })
  }
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
