import { useState } from 'react'
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { calcWeight } from '../../lib/guestUtils.js'
import TagPill from '../ui/TagPill.jsx'
import BottomSheet from '../ui/BottomSheet.jsx'

export default function GuestEditSheet({ guest, tags, userId, role, open, onClose }) {
  const [name, setName] = useState(guest?.name || '')
  const [selectedTags, setSelectedTags] = useState(guest?.tags || [])
  const [weightOverride, setWeightOverride] = useState(guest?.weightOverride || false)
  const [overrideValue, setOverrideValue] = useState(guest?.weightOverride ? guest.weight : null)

  const effectiveWeight = calcWeight(selectedTags, userId, tags, weightOverride, overrideValue)

  function toggleTag(tagId) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
    setWeightOverride(false)
  }

  async function handleSave() {
    await updateDoc(doc(db, 'guests', guest.id), {
      name: name.trim(),
      tags: selectedTags,
      weight: effectiveWeight,
      weightOverride,
      updatedAt: serverTimestamp(),
    })
    onClose()
  }

  async function handleDelete() {
    if (!confirm(`Remove ${guest.name} from your list?`)) return
    await deleteDoc(doc(db, 'guests', guest.id))
    onClose()
  }

  async function handleRsvpToggle(field) {
    const rsvp = { ...guest.rsvp }
    if (field === 'confirmed') {
      rsvp.confirmed = !rsvp.confirmed
    } else {
      rsvp[role] = { ...rsvp[role], [field]: !rsvp[role][field] }
    }
    await updateDoc(doc(db, 'guests', guest.id), { rsvp, updatedAt: serverTimestamp() })
  }

  if (!guest) return null

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Guest">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Tags</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {tags.map(tag => (
              <TagPill key={tag.id} tag={tag} selected={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Weight</span>
          <input
            type="number" min="1" max="10"
            value={weightOverride ? (overrideValue ?? effectiveWeight) : effectiveWeight}
            onChange={e => { setOverrideValue(Number(e.target.value)); setWeightOverride(true) }}
            className="w-14 border border-gray-300 rounded px-2 py-1 text-sm text-center"
          />
          {weightOverride && (
            <button type="button" onClick={() => { setWeightOverride(false); setOverrideValue(null) }} className="text-xs text-gray-400 underline">reset</button>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-2">RSVP Status</label>
          <div className="space-y-1 text-sm">
            {['hansen', 'lavita'].map(r => (
              <div key={r} className="flex items-center gap-3">
                <span className="w-16 text-xs font-medium capitalize">{r === 'hansen' ? 'Hansen (H)' : 'Lavita (L)'}</span>
                {['saveTheDateSent', 'inviteSent'].map(field => (
                  <label key={field} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={guest.rsvp[r]?.[field] || false}
                      onChange={() => handleRsvpToggle(field)}
                      disabled={r !== role}
                    />
                    {field === 'saveTheDateSent' ? '📅' : '✉️'}
                  </label>
                ))}
              </div>
            ))}
            <label className="flex items-center gap-2 text-xs mt-1">
              <input type="checkbox" checked={guest.rsvp.confirmed || false} onChange={() => handleRsvpToggle('confirmed')} />
              ✅ Confirmed (shared)
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={handleSave} className="flex-1 bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold">Save</button>
          <button type="button" onClick={handleDelete} className="px-4 border border-red-300 text-red-500 rounded-xl text-sm">Delete</button>
        </div>
      </div>
    </BottomSheet>
  )
}
