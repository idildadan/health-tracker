import { useEffect, useState } from 'react'

export default function GoalInput({ value, step = '1', onChange }) {
  const [text, setText] = useState(String(value ?? ''))

  // Dışarıdan goal değişirse (örn. başka yerden update) local text'i de güncelle.
  useEffect(() => {
    setText(String(value ?? ''))
  }, [value])

  function handleChange(e) {
    const next = e.target.value
    setText(next)
    if (next === '') return // boş input'ta global state'e dokunma
    const num = Number(next)
    if (!Number.isNaN(num) && num > 0) {
      onChange(num)
    }
  }

  function handleBlur() {
    if (text === '' || Number(text) <= 0) {
      // boş bırakıldıysa eski değeri geri yükle
      setText(String(value ?? ''))
    }
  }

  return (
    <input
      type="number"
      step={step}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}
