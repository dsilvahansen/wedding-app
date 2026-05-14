import { useEffect, useState } from 'react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.() }, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">
      {message}
    </div>
  )
}
