import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useTags() {
  const [tags, setTags] = useState([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tags'), snap => {
      setTags(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  return { tags }
}
