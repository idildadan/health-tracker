import { useState } from 'react'

// Hazır öğünler (kısayollar): sık yenen öğünleri kaydet, tek tıkla o güne ekle.
export default function MealPresets({ presets, currentFoodCount, onApply, onDelete, onSave }) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
    setName('')
    setSaving(false)
  }

  return (
    <section className="presets-section">
      <div className="presets-header">
        <h2>⭐ Hazır Öğünler</h2>
        {currentFoodCount > 0 && !saving && (
          <button className="link-btn" onClick={() => setSaving(true)}>
            💾 Bugünün öğününü kaydet
          </button>
        )}
      </div>

      {saving && (
        <div className="preset-save-row">
          <input
            type="text"
            placeholder="Kısayol adı (örn. Standart kahvaltı)"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} disabled={!name.trim()}>
            Kaydet
          </button>
          <button className="link-btn" onClick={() => setSaving(false)}>
            Vazgeç
          </button>
        </div>
      )}

      {presets.length === 0 ? (
        <p className="presets-empty">
          Henüz kısayol yok. Bir güne yemekleri ekleyip “Bugünün öğününü kaydet” ile kısayola
          dönüştür; sonra tek tıkla başka güne ekleyebilirsin.
        </p>
      ) : (
        <ul className="presets-list">
          {presets.map((p) => (
            <li key={p.id}>
              <span className="preset-name">
                {p.name}
                <span className="preset-count">{p.items?.length || 0} kalem</span>
              </span>
              <button className="preset-apply" onClick={() => onApply(p.id)} title="Bu güne ekle">
                ➕ Ekle
              </button>
              <button
                className="remove-btn"
                onClick={() => onDelete(p.id)}
                title="Kısayolu sil"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
