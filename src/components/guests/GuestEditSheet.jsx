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
  const [isGroup, setIsGroup] = useState(guest?.isGroup || false)
  const [adultCount, setAdultCount] = useState(guest?.adultCount ?? 1)
  const [kidCount, setKidCount] = useState(guest?.kidCount ?? 0)
  const [groupNotes, setGroupNotes] = useState(guest?.groupNotes || '')

  const effectiveWeight = calcWeight(selectedTags, userId, tags, weightOverride, overrideValue)

  function toggleTag(tagId) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
    setWeightOverride(false)
  }

  async function handleSave() {
    try {
      const groupFields = isGroup
        ? { isGroup: true, adultCount, kidCount, groupNotes }
        : { isGroup: false, adultCount: null, kidCount: null, groupNotes: null }

      await updateDoc(doc(db, 'guests', guest.id), {
        name: name.trim(),
        tags: selectedTags,
        weight: effectiveWeight,
        weightOverride,
        ...groupFields,
        updatedAt: serverTimestamp(),
      })
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to save. Please try again.')
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${guest.name} from your list?`)) return
    try {
      await deleteDoc(doc(db, 'guests', guest.id))
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to delete. Please try again.')
    }
  }

  async function handleRsvpToggle(field) {
    const rsvp = { ...guest.rsvp }
    if (field === 'confirmed') {
      rsvp.confirmed = !rsvp.confirmed
    } else {
      rsvp[role] = { ...rsvp[role], [field]: !rsvp[role]?.[field] }
    }
    try {
      await updateDoc(doc(db, 'guests', guest.id), { rsvp, updatedAt: serverTimestamp() })
    } catch (err) {
      console.error(err)
    }
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

        {/* Family / Group toggle */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isGroup ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
          <label htmlFor="editIsGroupToggle" className={`text-xs font-medium cursor-pointer select-none ${isGroup ? 'text-purple-600' : 'text-gray-500'}`}>
            👨‍👩‍👧 Family / Group
          </label>
          <input
            id="editIsGroupToggle"
            type="checkbox"
            aria-label="Family / Group"
            checked={isGroup}
            onChange={e => {
              setIsGroup(e.target.checked)
              if (!e.target.checked) {
                setAdultCount(1)
                setKidCount(0)
                setGroupNotes('')
              }
            }}
            className="ml-auto accent-purple-500 w-4 h-4 cursor-pointer"
          />
        </div>

        {isGroup && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-gray-500 mb-1">Adults</p>
                <div className="flex items-center justify-center gap-4">
                  <button type="button" aria-label="−" onClick={() => setAdultCount(c => Math.max(1, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
                  <span className="font-bold text-sm w-4 text-center">{adultCount}</span>
                  <button type="button" aria-label="+" onClick={() => setAdultCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
                </div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-gray-500 mb-1">Kids</p>
                <div className="flex items-center justify-center gap-4">
                  <button type="button" aria-label="−" onClick={() => setKidCount(c => Math.max(0, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
                  <span className="font-bold text-sm w-4 text-center">{kidCount}</span>
                  <button type="button" aria-label="+" onClick={() => setKidCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-1">Notes (optional)</p>
              <textarea
                value={groupNotes}
                onChange={e => setGroupNotes(e.target.value)}
                placeholder="e.g. John, Jane + 1 kid..."
                rows={2}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
              />
            </div>
          </div>
        )}

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
