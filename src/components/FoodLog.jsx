import { useEffect, useState } from 'react'
import { FOODS, calcMacros } from '../foodDatabase'
import { searchOpenFoodFacts } from '../openFoodFacts'

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

  const localMatches = FOODS.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    // Listede zaten yeterli yerel sonuç varsa online aramaya gerek yok
    if (query.trim().length < 3 || localMatches.length >= 3 || onlineUnavailable) {
      setOnlineResults([])
      return
    }
    const controller = new AbortController()
    setOnlineLoading(true)
    const timer = setTimeout(() => {
      searchOpenFoodFacts(query.trim(), controller.signal)
        .then((results) => setOnlineResults(results))
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Open Food Facts arama hatası:', err)
            setOnlineUnavailable(true)
          }
        })
        .finally(() => setOnlineLoading(false))
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, localMatches.length, onlineUnavailable])

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
