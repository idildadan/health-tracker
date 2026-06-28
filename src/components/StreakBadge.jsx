export default function StreakBadge({ streak }) {
  if (streak <= 0) {
    return <span className="streak-badge streak-zero">Henüz streak yok</span>
  }
  return (
    <span className="streak-badge">
      🔥 {streak} gün streak
    </span>
  )
}
