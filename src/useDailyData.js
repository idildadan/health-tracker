import { useEffect, useState } from 'react'
import { api, getToken, login as apiLogin, logout as apiLogout } from './api/client'

const todayKey = () => new Date().toISOString().slice(0, 10)

// 1 fincan Türk kahvesi ≈ yarım doz kafein, 1 fincan filtre kahve ≈ 1.25 doz.
export const CAFFEINE_DOSE = {
  turkishCoffee: 0.5,
  filterCoffee: 1.25,
}

export function caffeineFor(day) {
  return (
    Math.round(
      ((day.turkishCoffee || 0) * CAFFEINE_DOSE.turkishCoffee +
        (day.filterCoffee || 0) * CAFFEINE_DOSE.filterCoffee) *
        100,
    ) / 100
  )
}

const defaultGoals = {
  steps: 8000,
  water: 2000, // ml
  caffeine: 3, // doz
  calories: 2000,
  protein: 100, // g
  sleep: 8, // saat
  weight: 70, // kg, hedef kilo
}

const defaultDay = {
  steps: 0,
  water: 0,
  turkishCoffee: 0,
  filterCoffee: 0,
  calories: 0,
  protein: 0,
  sleep: 0,
  weight: 0,
  foods: [],
}

// Backend day satırını (caloriesTotal/proteinTotal) frontend şekline çevir.
function mapDay(d) {
  return {
    steps: d.steps || 0,
    water: d.water || 0,
    turkishCoffee: d.turkishCoffee || 0,
    filterCoffee: d.filterCoffee || 0,
    sleep: d.sleep || 0,
    weight: d.weight || 0,
    calories: d.caloriesTotal || 0,
    protein: d.proteinTotal || 0,
  }
}

function pickGoals(g) {
  const out = {}
  for (const k of Object.keys(defaultGoals)) if (g?.[k] != null) out[k] = g[k]
  return out
}

// --- Streak (localStorage/API'den hidrate edilen allData üzerinden, senkron) ---
const COMPLETION_THRESHOLD = 4
function isDayComplete(day) {
  const checks = [
    day.steps > 0,
    day.water > 0,
    day.turkishCoffee > 0 || day.filterCoffee > 0,
    day.calories > 0,
    day.sleep > 0,
    day.weight > 0,
  ]
  return checks.filter(Boolean).length >= COMPLETION_THRESHOLD
}
function computeStreak(allData) {
  let streak = 0
  let first = true
  const cursor = new Date()
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    const day = { ...defaultDay, ...allData[key] }
    if (isDayComplete(day)) {
      streak++
    } else if (!(first && key === todayKey())) {
      break
    }
    first = false
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// --- localStorage: offline-first cache (API kaynağın kendisi, bu sadece hızlı ilk boyama) ---
function loadCache() {
  try {
    return JSON.parse(localStorage.getItem('healthtrack_data') || '{}')
  } catch {
    return {}
  }
}
function loadGoalsCache() {
  try {
    const saved = JSON.parse(localStorage.getItem('healthtrack_goals') || 'null')
    return saved ? { ...defaultGoals, ...saved } : defaultGoals
  } catch {
    return defaultGoals
  }
}

export function useDailyData() {
  const [authed, setAuthed] = useState(Boolean(getToken()))
  const [user, setUser] = useState(null)
  const [date, setDate] = useState(todayKey())
  const [allData, setAllData] = useState(loadCache)
  const [goals, setGoals] = useState(loadGoalsCache)
  const [presets, setPresets] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  // localStorage cache'i güncel tut
  useEffect(() => {
    localStorage.setItem('healthtrack_data', JSON.stringify(allData))
  }, [allData])
  useEffect(() => {
    localStorage.setItem('healthtrack_goals', JSON.stringify(goals))
  }, [goals])

  // 401 -> oturumu düşür
  useEffect(() => {
    const onUnauth = () => {
      setAuthed(false)
      setUser(null)
    }
    window.addEventListener('ht-unauthorized', onUnauth)
    return () => window.removeEventListener('ht-unauthorized', onUnauth)
  }, [])

  // Giriş sonrası: kullanıcı + hedefler + geçmiş penceresi (takvim/streak/grafik için)
  useEffect(() => {
    if (!authed) return
    let cancelled = false
    setSyncing(true)
    ;(async () => {
      try {
        const me = await api('/api/me')
        if (cancelled) return
        setUser(me.user)
        const g = await api('/api/health/goals')
        if (cancelled) return
        setGoals((prev) => ({ ...prev, ...pickGoals(g.goals) }))
        const h = await api('/api/health/history?days=120')
        if (cancelled) return
        setAllData((prev) => {
          const next = { ...prev }
          for (const d of h.days) next[d.date] = { ...defaultDay, ...next[d.date], ...mapDay(d) }
          return next
        })
        const p = await api('/api/health/presets')
        if (cancelled) return
        setPresets(p.presets || [])
      } catch (err) {
        if (!cancelled && err.status !== 401) setError(err.message)
      } finally {
        if (!cancelled) setSyncing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authed])

  // Seçili günü (yemek detayıyla) yükle
  useEffect(() => {
    if (!authed) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await api(`/api/health/day/${date}`)
        if (cancelled) return
        setAllData((prev) => ({
          ...prev,
          [date]: { ...defaultDay, ...mapDay(r.day), foods: r.foods || [] },
        }))
      } catch (err) {
        if (!cancelled && err.status !== 401) setError(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authed, date])

  const rawDay = { ...defaultDay, ...allData[date], foods: allData[date]?.foods || [] }
  const day = { ...rawDay, caffeine: caffeineFor(rawDay) }

  async function reloadDay(d = date) {
    try {
      const r = await api(`/api/health/day/${d}`)
      setAllData((prev) => ({
        ...prev,
        [d]: { ...defaultDay, ...mapDay(r.day), foods: r.foods || [] },
      }))
    } catch {
      /* sessiz: bir sonraki işlemde tekrar denenir */
    }
  }

  // steps/water/coffee/sleep/weight — optimistic + PATCH; hata olursa günü yeniden çek
  function update(field, value) {
    setAllData((prev) => ({
      ...prev,
      [date]: { ...defaultDay, ...prev[date], [field]: value },
    }))
    api(`/api/health/day/${date}`, { method: 'PATCH', body: { [field]: value } }).catch((err) => {
      setError(err.message)
      reloadDay()
    })
  }

  function increment(field, amount) {
    const current = (allData[date] || defaultDay)[field] || 0
    update(field, Math.max(0, Math.round((current + amount) * 100) / 100))
  }

  async function addFood(entry) {
    const temp = { ...entry, _pending: true }
    setAllData((prev) => {
      const cur = { ...defaultDay, ...prev[date], foods: prev[date]?.foods || [] }
      return { ...prev, [date]: { ...cur, foods: [...cur.foods, temp] } }
    })
    try {
      const r = await api(`/api/health/day/${date}/foods`, {
        method: 'POST',
        body: {
          name: entry.name,
          grams: entry.grams ?? null,
          calories: entry.calories,
          protein: entry.protein,
          source: entry.source,
        },
      })
      setAllData((prev) => {
        const cur = { ...defaultDay, ...prev[date], foods: prev[date]?.foods || [] }
        const foods = cur.foods.filter((f) => f !== temp).concat(r.food)
        return {
          ...prev,
          [date]: { ...cur, foods, calories: r.totals.caloriesTotal, protein: r.totals.proteinTotal },
        }
      })
    } catch (err) {
      setError(err.message)
      reloadDay()
    }
  }

  async function removeFood(id) {
    setAllData((prev) => {
      const cur = { ...defaultDay, ...prev[date], foods: prev[date]?.foods || [] }
      return { ...prev, [date]: { ...cur, foods: cur.foods.filter((f) => f.id !== id) } }
    })
    try {
      const r = await api(`/api/health/foods/${id}`, { method: 'DELETE' })
      setAllData((prev) => ({
        ...prev,
        [date]: { ...prev[date], calories: r.totals.caloriesTotal, protein: r.totals.proteinTotal },
      }))
    } catch (err) {
      setError(err.message)
      reloadDay()
    }
  }

  function updateGoal(field, value) {
    setGoals((prev) => ({ ...prev, [field]: value }))
    api('/api/health/goals', { method: 'PATCH', body: { [field]: value } }).catch((err) =>
      setError(err.message),
    )
  }

  // --- Hazır öğünler (preset) ---
  // Seçili günün yemeklerini isimli bir kısayol olarak kaydet.
  async function savePreset(name) {
    const foods = allData[date]?.foods || []
    if (!name || foods.length === 0) return
    const items = foods.map((f) => ({
      name: f.name,
      grams: f.grams ?? null,
      calories: f.calories,
      protein: f.protein,
    }))
    try {
      const r = await api('/api/health/presets', { method: 'POST', body: { name, items } })
      setPresets((prev) => [...prev, r.preset])
    } catch (err) {
      setError(err.message)
    }
  }

  async function deletePreset(id) {
    setPresets((prev) => prev.filter((p) => p.id !== id))
    try {
      await api(`/api/health/presets/${id}`, { method: 'DELETE' })
    } catch (err) {
      setError(err.message)
    }
  }

  // Kısayoldaki kalemleri seçili güne ekle (tek tık).
  async function applyPreset(id) {
    try {
      const r = await api(`/api/health/day/${date}/apply-preset/${id}`, { method: 'POST' })
      setAllData((prev) => {
        const cur = { ...defaultDay, ...prev[date], foods: prev[date]?.foods || [] }
        const foods = cur.foods.concat(r.foods)
        return {
          ...prev,
          [date]: { ...cur, foods, calories: r.totals.caloriesTotal, protein: r.totals.proteinTotal },
        }
      })
    } catch (err) {
      setError(err.message)
      reloadDay()
    }
  }

  function history(days = 7) {
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const entry = { date: key, ...defaultDay, ...allData[key] }
      result.push({ ...entry, caffeine: caffeineFor(entry) })
    }
    return result
  }

  function previousWeight(beforeDate) {
    const keys = Object.keys(allData)
      .filter((k) => k < beforeDate && allData[k]?.weight > 0)
      .sort()
    if (keys.length === 0) return null
    return allData[keys[keys.length - 1]].weight
  }

  function exportData() {
    return { version: 1, exportedAt: new Date().toISOString(), data: allData, goals }
  }

  // İçe aktarma şimdilik yerel cache'e yazar (backend /api/health/import Aşama 6'da bağlanacak).
  function importData(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Geçersiz veri')
    if (payload.data && typeof payload.data === 'object') {
      setAllData((prev) => ({ ...prev, ...payload.data }))
    }
    if (payload.goals && typeof payload.goals === 'object') {
      setGoals((prev) => ({ ...prev, ...payload.goals }))
    }
  }

  const streak = computeStreak(allData)

  return {
    authed,
    user,
    syncing,
    error,
    clearError: () => setError(null),
    login: apiLogin,
    logout: apiLogout,
    date,
    setDate,
    day,
    goals,
    presets,
    update,
    increment,
    addFood,
    removeFood,
    updateGoal,
    savePreset,
    deletePreset,
    applyPreset,
    history,
    previousWeight,
    streak,
    exportData,
    importData,
  }
}
