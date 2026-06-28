import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4173

// Open Food Facts'e server-side proxy.
// Tarayıcı kendi originimizle konuştuğu için CORS sorunu yaşamıyor,
// ayrıca OFF'un anonim bot engelinden kaçınmak için düzgün bir User-Agent ekliyoruz.
app.get('/api/off-search', async (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) {
    return res.status(400).json({ error: 'q parametresi gerekli' })
  }

  const params = new URLSearchParams({
    search_terms: query,
    page_size: '15',
    lc: 'tr',
    fields: 'product_name,product_name_tr,brands,nutriments',
  })

  try {
    const upstream = await fetch(`https://world.openfoodfacts.org/api/v2/search?${params}`, {
      headers: {
        'User-Agent': 'HealthTrackerWorkshopApp/1.0 (idildadan@gmail.com)',
        Accept: 'application/json',
      },
    })
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `OFF ${upstream.status}` })
    }
    const data = await upstream.json()
    res.set('Cache-Control', 'public, max-age=300')
    res.json(data)
  } catch (err) {
    console.error('OFF proxy hatası:', err)
    res.status(502).json({ error: `Upstream başarısız: ${err.message}` })
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
