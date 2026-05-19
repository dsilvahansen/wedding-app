import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useTags() {
  const [tags, setTags] = useState([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tags'), snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      raw.sort((a, b) => {
        const ao = a.order ?? Infinity
        const bo = b.order ?? Infinity
        if (ao !== bo) return ao - bo
        return (a.name ?? '').localeCompare(b.name ?? '')
      })
      setTags(raw)
    })
    return unsub
  }, [])

  return { tags }
}
