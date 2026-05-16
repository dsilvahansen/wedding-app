import { useEffect, useRef, useState } from 'react'

export default function Toast({ message, onDone, action }) {
  const [visible, setVisible] = useState(true)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone })

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDoneRef.current?.() }, 2000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">
      {message}
      {action && (
        <button
          type="button"
          onClick={() => { action.onClick(); setVisible(false); onDoneRef.current?.() }}
          className="text-purple-300 font-semibold underline"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
