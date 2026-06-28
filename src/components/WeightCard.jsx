export default function WeightCard({ value, goal, previous, onSet, onIncrement }) {
  const diff = previous != null && value > 0 ? Math.round((value - previous) * 10) / 10 : null

  return (
    <div className="card weight-card">
      <div className="card-header">
        <span className="card-icon">⚖️</span>
        <span className="card-label">Kilo</span>
      </div>

      <div className="card-value">
        {value > 0 ? value : '–'}
        <span className="card-unit">kg</span>
        {diff != null && diff !== 0 && (
          <span className={`weight-diff ${diff > 0 ? 'up' : 'down'}`}>
            {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
          </span>
        )}
      </div>

      <div className="goal-text">Hedef: {goal} kg</div>

      <div className="card-actions">
        <button onClick={() => onIncrement(-0.1)}>-0.1</button>
        <input
          type="number"
          step="0.1"
          value={value || ''}
          placeholder="kg"
          onChange={(e) => onSet(Number(e.target.value) || 0)}
        />
        <button onClick={() => onIncrement(0.1)}>+0.1</button>
      </div>
    </div>
  )
}
