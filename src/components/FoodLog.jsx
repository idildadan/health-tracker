import { useEffect, useState } from 'react'
import { FOODS, calcMacros } from '../foodDatabase'
import { searchOpenFoodFacts } from '../openFoodFacts'
import { parseMealWithAI } from '../aiMeal'

export default function FoodLog({ foods, calories, proteinGoal, caloriesGoal, protein, onAdd, onRemove }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(FOODS[0])
  const [grams, setGrams] = useState(FOODS[0].unit.grams)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualKcal, setManualKcal] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [onlineResults, setOnlineResults] = useState([])
  const [onlineLoading, setOnlineLoading] = useState(false)
  const [onlineUnavailable, setOnlineUnavailable] = useState(false)

  const [aiOpen, setAiOpen] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [aiPreview, setAiPreview] = useState(null) // { items: [...], notes }

  const localMatches = FOODS.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    // Listede zaten yeterli yerel sonuç varsa online aramaya gerek yok
    if (query.trim().length < 3 || localMatches.length >= 3) {
      setOnlineResults([])
      setOnlineLoading(false)
      return
    }
    // Yeni sorguda başarısızlık flag'ini sıfırla — kullanıcı tekrar denemek istiyor
    setOnlineUnavailable(false)
    const controller = new AbortController()
    setOnlineLoading(true)
    const timer = setTimeout(() => {
      searchOpenFoodFacts(query.trim(), controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) setOnlineResults(results)
        })
        .catch((err) => {
          // Abort = kullanıcı yazmaya devam etti, sessizce yut
          if (err.name === 'AbortError' || controller.signal.aborted) return
          console.error('Open Food Facts arama hatası:', err)
          setOnlineUnavailable(true)
        })
        .finally(() => {
          if (!controller.signal.aborted) setOnlineLoading(false)
        })
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, localMatches.length])

  function selectFood(food) {
    setSelected(food)
    setGrams(food.unit.grams)
  }

  function addSelected() {
    const macros = calcMacros(selected, grams)
    onAdd({
      id: `${selected.id}-${Date.now()}`,
      name: selected.name,
      grams,
      ...macros,
    })
  }

  function addManual() {
    const kcal = Number(manualKcal) || 0
    const prot = Number(manualProtein) || 0
    if (!manualName || (!kcal && !prot)) return
    onAdd({
      id: `manual-${Date.now()}`,
      name: manualName,
      grams: null,
      calories: kcal,
      protein: prot,
    })
    setManualName('')
    setManualKcal('')
    setManualProtein('')
    setManualOpen(false)
  }

  async function runAiParse() {
    if (!aiText.trim()) return
    setAiLoading(true)
    setAiError(null)
    setAiPreview(null)
    try {
      const result = await parseMealWithAI(aiText.trim())
      setAiPreview(result)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  function addAllAiItems() {
    if (!aiPreview?.items) return
    aiPreview.items.forEach((it, i) => {
      onAdd({
        id: `ai-${Date.now()}-${i}`,
        name: it.name,
        grams: it.grams || null,
        calories: Math.round(it.calories || 0),
        protein: Math.round((it.protein || 0) * 10) / 10,
      })
    })
    setAiText('')
    setAiPreview(null)
    setAiOpen(false)
  }

  return (
    <div className="card foodlog-card">
      <div className="card-header">
        <span className="card-icon">🍽️</span>
        <span className="card-label">Yemekler</span>
      </div>

      <div className="macro-summary">
        <div>
          🔥 {calories} <span className="card-unit">/ {caloriesGoal} kcal</span>
        </div>
        <div>
          🥩 {protein} <span className="card-unit">/ {proteinGoal} g</span>
        </div>
      </div>

      <button className="ai-toggle" onClick={() => setAiOpen((v) => !v)}>
        🤖 {aiOpen ? 'AI öğün girişini kapat' : 'AI ile öğün ekle'}
      </button>

      {aiOpen && (
        <div className="ai-panel">
          <textarea
            className="ai-textarea"
            rows={3}
            placeholder="Örn: kahvaltıda 2 yumurta, 1 dilim ekşi mayalı ekmek, beyaz peynir, 5 zeytin, bir bardak çay"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
          />
          <div className="ai-actions">
            <button className="ai-run" onClick={runAiParse} disabled={aiLoading || !aiText.trim()}>
              {aiLoading ? 'Hesaplanıyor...' : 'Hesapla'}
            </button>
            {aiError && <span className="ai-error">{aiError}</span>}
          </div>

          {aiPreview && (
            <div className="ai-preview">
              {aiPreview.notes && <div className="ai-notes">💭 {aiPreview.notes}</div>}
              <ul className="food-list">
                {aiPreview.items.map((it, i) => (
                  <li key={i}>
                    <span className="food-list-name">
                      {it.name} {it.grams ? `(${it.grams}g)` : ''}
                    </span>
                    <span className="food-list-macros">
                      {Math.round(it.calories || 0)} kcal · {Math.round((it.protein || 0) * 10) / 10}g
                    </span>
                  </li>
                ))}
              </ul>
              <div className="ai-totals">
                Toplam:{' '}
                <strong>
                  {Math.round(aiPreview.items.reduce((s, it) => s + (it.calories || 0), 0))} kcal ·{' '}
                  {Math.round(aiPreview.items.reduce((s, it) => s + (it.protein || 0), 0) * 10) / 10}g protein
                </strong>
              </div>
              <button className="ai-add-all" onClick={addAllAiItems}>
                ✓ Hepsini güne ekle
              </button>
            </div>
          )}
        </div>
      )}

      <input
        className="food-search"
        type="text"
        placeholder="Yemek ara... (3+ harf: online da arar)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="food-options">
        {localMatches.slice(0, 6).map((f) => (
          <button
            key={f.id}
            className={`food-option ${f.id === selected.id ? 'active' : ''}`}
            onClick={() => selectFood(f)}
          >
            {f.name}
          </button>
        ))}
      </div>

      {query.trim().length >= 3 && localMatches.length < 3 && !onlineUnavailable && (
        <div className="online-results">
          {onlineLoading && <div className="online-status">Online aranıyor...</div>}
          {!onlineLoading && onlineResults.length === 0 && (
            <div className="online-status">Online sonuç bulunamadı</div>
          )}
          <div className="food-options">
            {onlineResults.map((f) => (
              <button
                key={f.id}
                className={`food-option online ${f.id === selected.id ? 'active' : ''}`}
                onClick={() => selectFood(f)}
                title={`${Math.round(f.kcal100)} kcal / ${f.protein100}g protein (100g)`}
              >
                🌐 {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {onlineUnavailable && (
        <div className="online-status">
          🌐 Çevrimiçi yemek arama şu anda kullanılamıyor — yerel listeden veya manuel girişten devam edebilirsin.
        </div>
      )}

      <div className="food-add-row">
        <span className="food-add-label">{selected.name}</span>
        <input
          type="number"
          value={grams}
          onChange={(e) => setGrams(Number(e.target.value) || 0)}
        />
        <span className="card-unit">g</span>
        <button onClick={addSelected}>Ekle</button>
      </div>
      <div className="food-quick-hint">
        Hızlı: {selected.unit.label} ≈ {selected.unit.grams}g
        <button className="link-btn" onClick={() => setGrams(selected.unit.grams)}>
          uygula
        </button>
      </div>

      <button className="link-btn manual-toggle" onClick={() => setManualOpen((v) => !v)}>
        {manualOpen ? 'Manuel girişi kapat' : 'Listede yok, manuel ekle'}
      </button>

      {manualOpen && (
        <div className="food-manual-row">
          <input
            type="text"
            placeholder="Yemek adı"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />
          <input
            type="number"
            placeholder="kcal"
            value={manualKcal}
            onChange={(e) => setManualKcal(e.target.value)}
          />
          <input
            type="number"
            placeholder="protein g"
            value={manualProtein}
            onChange={(e) => setManualProtein(e.target.value)}
          />
          <button onClick={addManual}>Ekle</button>
        </div>
      )}

      {foods.length > 0 && (
        <ul className="food-list">
          {foods.map((f) => (
            <li key={f.id}>
              <span className="food-list-name">
                {f.name} {f.grams ? `(${f.grams}g)` : ''}
              </span>
              <span className="food-list-macros">
                {f.calories} kcal · {f.protein}g
              </span>
              <button className="remove-btn" onClick={() => onRemove(f.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
