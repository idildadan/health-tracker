import { useEffect, useState } from 'react'

const todayKey = () => new Date().toISOString().slice(0, 10)

// 1 fincan Türk kahvesi ≈ yarım doz kafein, 1 fincan filtre kahve ≈ 1.25 doz kafein.
// (Filtre kahvenin kafein içeriği Türk kahvesine göre yaklaşık 2.5x kabul edildi; gerekirse buradan ayarla.)
export const CAFFEINE_DOSE = {
  turkishCoffee: 0.5,
  filterCoffee: 1.25,
}

export function caffeineFor(day) {
  return Math.round(
    ((day.turkishCoffee || 0) * CAFFEINE_DOSE.turkishCoffee +
      (day.filterCoffee || 0) * CAFFEINE_DOSE.filterCoffee) *
      100,
  ) / 100
}

const defaultGoals = {
  steps: 8000,
  water: 2000, // ml
  caffeine: 3, // doz
  calories: 2000,
  protein: 100, // g
  sleep: 8, // hours
}

const defaultDay = {
  steps: 0,
  water: 0,
  turkishCoffee: 0,
  filterCoffee: 0,
  calories: 0,
  protein: 0,
  sleep: 0,
  foods: [],
}

function loadAllData() {
  try {
    return JSON.parse(localStorage.getItem('healthtrack_data') || '{}')
  } catch {
    return {}
  }
}

function loadGoals() {
  try {
    const saved = JSON.parse(localStorage.getItem('healthtrack_goals') || 'null')
    return saved ? { ...defaultGoals, ...saved } : defaultGoals
  } catch {
    return defaultGoals
  }
}

export function useDailyData() {
  const [date, setDate] = useState(todayKey())
  const [allData, setAllData] = useState(loadAllData)
  const [goals, setGoals] = useState(loadGoals)

  useEffect(() => {
    localStorage.setItem('healthtrack_data', JSON.stringify(allData))
  }, [allData])

  useEffect(() => {
    localStorage.setItem('healthtrack_goals', JSON.stringify(goals))
  }, [goals])

  const rawDay = { ...defaultDay, ...allData[date], foods: allData[date]?.foods || [] }
  const day = { ...rawDay, caffeine: caffeineFor(rawDay) }

  function update(field, value) {
    setAllData((prev) => ({
      ...prev,
      [date]: { ...defaultDay, ...prev[date], [field]: value },
    }))
  }

  function increment(field, amount) {
    const current = (allData[date] || defaultDay)[field] || 0
    update(field, Math.max(0, current + amount))
  }

  function addFood(entry) {
    setAllData((prev) => {
      const current = { ...defaultDay, ...prev[date], foods: prev[date]?.foods || [] }
      const foods = [...current.foods, entry]
      return {
        ...prev,
        [date]: {
          ...current,
          foods,
          calories: Math.round(foods.reduce((s, f) => s + f.calories, 0)),
          protein: Math.round(foods.reduce((s, f) => s + f.protein, 0) * 10) / 10,
        },
      }
    })
  }

  function removeFood(id) {
    setAllData((prev) => {
      const current = { ...defaultDay, ...prev[date], foods: prev[date]?.foods || [] }
      const foods = current.foods.filter((f) => f.id !== id)
      return {
        ...prev,
        [date]: {
          ...current,
          foods,
          calories: Math.round(foods.reduce((s, f) => s + f.calories, 0)),
          protein: Math.round(foods.reduce((s, f) => s + f.protein, 0) * 10) / 10,
        },
      }
    })
  }

  function updateGoal(field, value) {
    setGoals((prev) => ({ ...prev, [field]: value }))
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

  return { date, setDate, day, goals, update, increment, addFood, removeFood, updateGoal, history }
}
