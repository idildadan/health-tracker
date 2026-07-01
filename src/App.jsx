import { useState } from 'react'
import { useDailyData } from './useDailyData'
import TrackerCard from './components/TrackerCard'
import CoffeeCard from './components/CoffeeCard'
import WeightCard from './components/WeightCard'
import StreakBadge from './components/StreakBadge'
import GoalInput from './components/GoalInput'
import FoodLog from './components/FoodLog'
import HistoryChart from './components/HistoryChart'
import LoginScreen from './components/LoginScreen'
import './App.css'

const SIMPLE_TRACKERS = [
  { field: 'steps', icon: '👟', label: 'Adım', unit: 'adım', step: 500, color: '#4ade80' },
  { field: 'water', icon: '💧', label: 'Su', unit: 'ml', step: 250, color: '#38bdf8' },
  { field: 'sleep', icon: '😴', label: 'Uyku', unit: 'saat', step: 0.5, color: '#818cf8' },
]

const HISTORY_TRACKERS = [
  { field: 'steps', icon: '👟', label: 'Adım', goal: 'steps', color: '#4ade80' },
  { field: 'water', icon: '💧', label: 'Su', goal: 'water', color: '#38bdf8' },
  { field: 'caffeine', icon: '☕', label: 'Kafein', goal: 'caffeine', color: '#a16207' },
  { field: 'calories', icon: '🔥', label: 'Kalori', goal: 'calories', color: '#f97316' },
  { field: 'protein', icon: '🥩', label: 'Protein', goal: 'protein', color: '#f43f5e' },
  { field: 'sleep', icon: '😴', label: 'Uyku', goal: 'sleep', color: '#818cf8' },
  { field: 'weight', icon: '⚖️', label: 'Kilo', goal: 'weight', color: '#c084fc' },
]

function App() {
  const {
    authed,
    user,
    syncing,
    error,
    clearError,
    login,
    logout,
    date,
    setDate,
    day,
    goals,
    increment,
    update,
    addFood,
    removeFood,
    updateGoal,
    history,
    previousWeight,
    streak,
    exportData,
    importData,
  } = useDailyData()
  const [showGoals, setShowGoals] = useState(false)
  const last7 = history(7)

  if (!authed) return <LoginScreen onLogin={login} />

  function handleExport() {
    const payload = exportData()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `saglik-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const payload = JSON.parse(text)
        importData(payload)
        alert('✓ Veriler başarıyla yüklendi')
      } catch (err) {
        alert(`Yükleme başarısız: ${err.message}`)
      }
    }
    input.click()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sağlık Takibi</h1>
        <StreakBadge streak={streak} />
        <input
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className="goals-toggle" onClick={() => setShowGoals((v) => !v)}>
          🎯 Hedefler
        </button>
        <div className="account">
          {syncing && <span className="sync-dot" title="Senkronize ediliyor">⟳</span>}
          {user && <span className="account-email" title={user.email}>{user.email}</span>}
          <button className="logout-btn" onClick={logout} title="Çıkış yap">
            Çıkış
          </button>
        </div>
      </header>

      {error && (
        <div className="error-toast" role="alert" onClick={clearError}>
          ⚠️ {error} <span className="error-dismiss">✕</span>
        </div>
      )}

      {showGoals && (
        <section className="goals-panel">
          <label>
            👟 Adım hedefi
            <GoalInput value={goals.steps} onChange={(v) => updateGoal('steps', v)} />
          </label>
          <label>
            💧 Su hedefi (ml)
            <GoalInput value={goals.water} onChange={(v) => updateGoal('water', v)} />
          </label>
          <label>
            ☕ Kafein hedefi (doz)
            <GoalInput step="0.5" value={goals.caffeine} onChange={(v) => updateGoal('caffeine', v)} />
          </label>
          <label>
            🔥 Kalori hedefi
            <GoalInput value={goals.calories} onChange={(v) => updateGoal('calories', v)} />
          </label>
          <label>
            🥩 Protein hedefi (g)
            <GoalInput value={goals.protein} onChange={(v) => updateGoal('protein', v)} />
          </label>
          <label>
            😴 Uyku hedefi (saat)
            <GoalInput step="0.5" value={goals.sleep} onChange={(v) => updateGoal('sleep', v)} />
          </label>
          <label>
            ⚖️ Hedef kilo (kg)
            <GoalInput step="0.1" value={goals.weight} onChange={(v) => updateGoal('weight', v)} />
          </label>
          <div className="backup-row">
            <button onClick={handleExport}>💾 Yedek indir</button>
            <button onClick={handleImportClick}>📥 Yedek yükle</button>
          </div>
        </section>
      )}

      <main className="card-grid">
        {SIMPLE_TRACKERS.map((t) => (
          <TrackerCard
            key={t.field}
            icon={t.icon}
            label={t.label}
            unit={t.unit}
            step={t.step}
            value={day[t.field] || 0}
            goal={goals[t.field]}
            onIncrement={(amount) => increment(t.field, amount)}
            onSet={(value) => update(t.field, value)}
          />
        ))}
        <WeightCard
          value={day.weight}
          goal={goals.weight}
          previous={previousWeight(date)}
          onSet={(value) => update('weight', value)}
          onIncrement={(amount) => increment('weight', amount)}
        />
        <CoffeeCard
          turkish={day.turkishCoffee}
          filter={day.filterCoffee}
          caffeine={day.caffeine}
          goal={goals.caffeine}
          onIncrement={increment}
        />
      </main>

      <FoodLog
        foods={day.foods}
        calories={day.calories}
        protein={day.protein}
        caloriesGoal={goals.calories}
        proteinGoal={goals.protein}
        onAdd={addFood}
        onRemove={removeFood}
      />

      <section className="history-section">
        <h2>Son 7 Gün</h2>
        <div className="history-grid">
          {HISTORY_TRACKERS.map((t) => (
            <div key={t.field} className="history-block">
              <div className="history-title">
                {t.icon} {t.label}
              </div>
              <HistoryChart history={last7} field={t.field} goal={goals[t.goal]} color={t.color} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default App
