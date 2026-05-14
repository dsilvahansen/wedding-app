import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useGuests() {
  const [guests, setGuests] = useState([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'guests'), snap => {
      setGuests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  return { guests }
}
