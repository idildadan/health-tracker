import { CAFFEINE_DOSE } from '../useDailyData'

function CoffeeRow({ icon, label, value, dosePerCup, onIncrement }) {
  return (
    <div className="coffee-row">
      <span className="coffee-row-label">
        {icon} {label}
      </span>
      <div className="coffee-row-actions">
        <button onClick={() => onIncrement(-1)}>-</button>
        <span className="coffee-row-value">{value}</span>
        <button onClick={() => onIncrement(1)}>+</button>
      </div>
      <span className="coffee-row-goal">fincan · {dosePerCup} doz/fincan</span>
    </div>
  )
}

export default function CoffeeCard({ turkish, filter, caffeine, goal, onIncrement }) {
  const pct = goal ? Math.min(100, Math.round((caffeine / goal) * 100)) : 0

  return (
    <div className="card coffee-card">
      <div className="card-header">
        <span className="card-icon">☕</span>
        <span className="card-label">Kafein</span>
      </div>

      <div className="card-value">
        {caffeine}
        <span className="card-unit">doz</span>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="goal-text">
        Hedef: {goal} doz ({pct}%)
      </div>

      <CoffeeRow
        icon="🇹🇷"
        label="Türk kahvesi"
        value={turkish}
        dosePerCup={CAFFEINE_DOSE.turkishCoffee}
        onIncrement={(amt) => onIncrement('turkishCoffee', amt)}
      />
      <CoffeeRow
        icon="🥤"
        label="Filtre kahve"
        value={filter}
        dosePerCup={CAFFEINE_DOSE.filterCoffee}
        onIncrement={(amt) => onIncrement('filterCoffee', amt)}
      />
    </div>
  )
}
