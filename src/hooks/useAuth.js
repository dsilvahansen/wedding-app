import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          setUser(firebaseUser)
          setRole(snap.exists() ? snap.data().role : null)
        } else {
          setUser(null)
          setRole(null)
        }
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout = () => signOut(auth)

  return { user, role, loading, login, logout }
}
