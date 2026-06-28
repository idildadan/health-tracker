import { useState } from 'react'
import { useDailyData } from './useDailyData'
import TrackerCard from './components/TrackerCard'
import CoffeeCard from './components/CoffeeCard'
import WeightCard from './components/WeightCard'
import StreakBadge from './components/StreakBadge'
import FoodLog from './components/FoodLog'
import HistoryChart from './components/HistoryChart'
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
  } = useDailyData()
  const [showGoals, setShowGoals] = useState(false)
  const last7 = history(7)

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
      </header>

      {showGoals && (
        <section className="goals-panel">
          <label>
            👟 Adım hedefi
            <input type="number" value={goals.steps} onChange={(e) => updateGoal('steps', Number(e.target.value) || 0)} />
          </label>
          <label>
            💧 Su hedefi (ml)
            <input type="number" value={goals.water} onChange={(e) => updateGoal('water', Number(e.target.value) || 0)} />
          </label>
          <label>
            ☕ Kafein hedefi (doz)
            <input
              type="number"
              step="0.5"
              value={goals.caffeine}
              onChange={(e) => updateGoal('caffeine', Number(e.target.value) || 0)}
            />
          </label>
          <label>
            🔥 Kalori hedefi
            <input type="number" value={goals.calories} onChange={(e) => updateGoal('calories', Number(e.target.value) || 0)} />
          </label>
          <label>
            🥩 Protein hedefi (g)
            <input type="number" value={goals.protein} onChange={(e) => updateGoal('protein', Number(e.target.value) || 0)} />
          </label>
          <label>
            😴 Uyku hedefi (saat)
            <input type="number" value={goals.sleep} onChange={(e) => updateGoal('sleep', Number(e.target.value) || 0)} />
          </label>
          <label>
            ⚖️ Hedef kilo (kg)
            <input
              type="number"
              step="0.1"
              value={goals.weight}
              onChange={(e) => updateGoal('weight', Number(e.target.value) || 0)}
            />
          </label>
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
        <CoffeeCard
          turkish={day.turkishCoffee}
          filter={day.filterCoffee}
          caffeine={day.caffeine}
          goal={goals.caffeine}
          onIncrement={increment}
        />
        <WeightCard
          value={day.weight}
          goal={goals.weight}
          previous={previousWeight(date)}
          onSet={(value) => update('weight', value)}
          onIncrement={(amount) => increment('weight', amount)}
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
