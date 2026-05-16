import { useState, useRef, useCallback, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './useAuth.js'

export function useBulkSelect() {
  const { role } = useAuth()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [undoMessage, setUndoMessage] = useState('')
  const snapshotRef = useRef([])
  const undoTimerRef = useRef(null)

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      setSelectedIds(new Set())
      if (prev) {
        clearTimeout(undoTimerRef.current)
      }
      return !prev
    })
  }, [])

  const toggleGuest = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const applyBulkAction = useCallback(async (field, guests) => {
    const selected = guests.filter(g => selectedIds.has(g.id))
    if (selected.length === 0) return

    const isConfirmed = field === 'confirmed'
    const allTrue = selected.every(g =>
      isConfirmed ? g.rsvp?.confirmed : g.rsvp?.[role]?.[field]
    )
    const newValue = !allTrue

    // Snapshot for undo
    snapshotRef.current = selected.map(g => ({
      guestId: g.id,
      field,
      previousValue: isConfirmed ? (g.rsvp?.confirmed ?? false) : (g.rsvp?.[role]?.[field] ?? false),
    }))

    try {
      await Promise.all(selected.map(g => {
        const fieldPath = isConfirmed ? 'rsvp.confirmed' : `rsvp.${role}.${field}`
        return updateDoc(doc(db, 'guests', g.id), { [fieldPath]: newValue, updatedAt: serverTimestamp() })
      }))

      clearTimeout(undoTimerRef.current)
      setUndoAvailable(true)
      setUndoMessage(`${selected.length} guest${selected.length > 1 ? 's' : ''} updated`)
      undoTimerRef.current = setTimeout(() => setUndoAvailable(false), 4000)
      return null
    } catch (err) {
      snapshotRef.current = []
      setUndoAvailable(false)
      return 'Failed to update. Try again.'
    }
  }, [selectedIds, role])

  const undoBulkAction = useCallback(async (guests) => {
    const snapshot = snapshotRef.current
    if (snapshot.length === 0) return null

    clearTimeout(undoTimerRef.current)
    setUndoAvailable(false)
    setUndoMessage('')

    try {
      await Promise.all(snapshot.map(({ guestId, field, previousValue }) => {
        const guest = guests.find(g => g.id === guestId)
        if (!guest) return Promise.resolve()
        const isConfirmed = field === 'confirmed'
        const fieldPath = isConfirmed ? 'rsvp.confirmed' : `rsvp.${role}.${field}`
        return updateDoc(doc(db, 'guests', guestId), { [fieldPath]: previousValue, updatedAt: serverTimestamp() })
      }))
      snapshotRef.current = []
      return null
    } catch (err) {
      return 'Failed to undo. Try again.'
    }
  }, [role])

  useEffect(() => {
    return () => clearTimeout(undoTimerRef.current)
  }, [])

  return {
    selectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleGuest,
    applyBulkAction,
    undoAvailable,
    undoMessage,
    undoBulkAction,
  }
}
