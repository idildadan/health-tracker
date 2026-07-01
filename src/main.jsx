import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { captureTokenFromUrl } from './api/client'

// OAuth dönüşünde adres çubuğundaki #token=...'ı render'dan önce yakala ve sakla.
captureTokenFromUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
