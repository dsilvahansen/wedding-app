import { useState } from 'react'
import { doc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { TAG_COLORS } from '../../lib/tagUtils.js'
import BottomSheet from '../ui/BottomSheet.jsx'

export default function TagEditSheet({ tag, userId, role, open, onClose }) {
  const isNew = !tag?.id
  const [name, setName] = useState(tag?.name || '')
  const [weight, setWeight] = useState(tag ? (tag.weights?.[userId] ?? 5) : 5)
  const [color, setColor] = useState(tag?.color || TAG_COLORS[0])

  async function handleSave() {
    if (!name.trim()) return
    try {
      if (isNew) {
        await addDoc(collection(db, 'tags'), {
          name: name.trim(),
          createdBy: userId,
          createdByInitial: role === 'hansen' ? 'H' : 'L',
          weights: { [userId]: weight },
          color,
        })
      } else {
        await updateDoc(doc(db, 'tags', tag.id), {
          name: name.trim(),
          [`weights.${userId}`]: weight,
          color,
        })
      }
      onClose()
    } catch (err) {
      console.error('Failed to save tag:', err)
      alert('Failed to save tag. Please try again.')
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from all guests.`)) return
    try {
      await deleteDoc(doc(db, 'tags', tag.id))
      onClose()
    } catch (err) {
      console.error('Failed to delete tag:', err)
      alert('Failed to delete tag. Please try again.')
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isNew ? 'New Tag' : 'Edit Tag'}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500">Tag name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            placeholder="e.g. Family, Colleagues..."
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Your weight (1–10)</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="range" min="1" max="10" value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              className="flex-1 accent-purple-500"
            />
            <span className="text-sm font-bold text-purple-600 w-6 text-center">{weight}</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Color</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-purple-500' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={handleSave} className="flex-1 bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold">
            {isNew ? 'Create Tag' : 'Save'}
          </button>
          {!isNew && (
            <button type="button" onClick={handleDelete} className="px-4 border border-red-300 text-red-500 rounded-xl text-sm">Delete</button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
