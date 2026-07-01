import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// health-tracker frontend'ini Railway'de sunan minimal statik sunucu.
// API mantığı (OFF proxy, AI meal) ortak backend'e taşındı; burada YOK.
// Frontend backend'e VITE_API_BASE üzerinden konuşur.
const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4173

// Vite build çıktısı + SPA fallback
const distDir = join(__dirname, 'dist')
app.use(express.static(distDir))
app.get(/.*/, (_req, res) => {
  res.sendFile(join(distDir, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`health-tracker frontend :${PORT}`)
})
