export default function TrackerCard({
  icon,
  label,
  unit,
  value,
  goal,
  step = 1,
  onIncrement,
  onSet,
}) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <span className="card-label">{label}</span>
      </div>

      <div className="card-value">
        {value}
        <span className="card-unit">{unit}</span>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="goal-text">
        Hedef: {goal} {unit} ({pct}%)
      </div>

      <div className="card-actions">
        <button onClick={() => onIncrement(-step)}>-{step}</button>
        <input
          type="number"
          value={value}
          onChange={(e) => onSet(Number(e.target.value) || 0)}
        />
        <button onClick={() => onIncrement(step)}>+{step}</button>
      </div>
    </div>
  )
}
