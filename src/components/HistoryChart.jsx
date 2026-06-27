export default function HistoryChart({ history, field, goal, color }) {
  const max = Math.max(goal, ...history.map((h) => h[field] || 0), 1)

  return (
    <div className="history-chart">
      {history.map((h) => {
        const heightPct = Math.round(((h[field] || 0) / max) * 100)
        const dayLabel = new Date(h.date).toLocaleDateString('tr-TR', {
          weekday: 'short',
        })
        return (
          <div className="history-bar-wrap" key={h.date}>
            <div className="history-bar-track">
              <div
                className="history-bar-fill"
                style={{ height: `${heightPct}%`, background: color }}
              />
            </div>
            <span className="history-bar-label">{dayLabel}</span>
          </div>
        )
      })}
    </div>
  )
}
