import { useState, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import BottomSheet from '../ui/BottomSheet.jsx'

export default function GuestTagAssignSheet({ tag, guests, open, onClose }) {
  const initialSelectedRef = useRef(
    new Set(guests.filter(g => g.tags?.includes(tag.id)).map(g => g.id))
  )
  const [selected, setSelected] = useState(() => new Set(initialSelectedRef.current))
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  function toggle(guestId) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(guestId)) {
        next.delete(guestId)
      } else {
        next.add(guestId)
      }
      return next
    })
  }

  async function handleSave() {
    const writes = guests.filter(g => {
      const wasSelected = initialSelectedRef.current.has(g.id)
      const isSelected = selected.has(g.id)
      return wasSelected !== isSelected
    })
    setSaving(true)
    try {
      await Promise.all(
        writes.map(g => {
          const newTags = selected.has(g.id)
            ? [...new Set([...(g.tags ?? []), tag.id])]
            : (g.tags ?? []).filter(id => id !== tag.id)
          return updateDoc(doc(db, 'guests', g.id), { tags: newTags })
        })
      )
      onClose()
    } catch (err) {
      console.error('Failed to update tag assignments:', err)
    } finally {
      setSaving(false)
    }
  }

  const assignedCount = selected.size
  const totalCount = guests.length

  const displayGuests = guests
    .filter(g => g.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aSelected = selected.has(a.id)
      const bSelected = selected.has(b.id)
      if (aSelected !== bSelected) return aSelected ? -1 : 1
      return 0
    })

  return (
    <BottomSheet open={open} onClose={onClose} title={`Assign to "${tag.name}"`}>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search guests..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300"
        />
        <p className="text-xs text-gray-500">{assignedCount} / {totalCount} guests assigned</p>
        <div className="divide-y divide-gray-100">
          {displayGuests.map(g => {
            const headcount = g.isGroup ? (g.adultCount ?? 0) + (g.kidCount ?? 0) : null
            return (
              <label key={g.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggle(g.id)}
                  className="accent-purple-500 w-4 h-4"
                />
                <span className="text-sm flex-1">{g.name}</span>
                {headcount !== null && (
                  <span className="text-xs text-gray-400">{headcount} people</span>
                )}
              </label>
            )
          })}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold mt-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </BottomSheet>
  )
}
