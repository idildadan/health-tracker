import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages proje sayfası: https://idildadan.github.io/health-tracker/
  base: '/health-tracker/',
  preview: {
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Sağlık Takibi',
        short_name: 'Sağlık',
        description: 'Adım, su, kafein, kalori, protein ve uyku takibi',
        theme_color: '#0f1117',
        background_color: '#0f1117',
        display: 'standalone',
        start_url: '/health-tracker/',
        scope: '/health-tracker/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
})
