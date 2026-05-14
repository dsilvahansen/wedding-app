import { useEffect } from 'react'

export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto z-50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
