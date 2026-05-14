# Wedding Planner App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first wedding planning web app with Firebase backend, starting with a Guest Manager module for Hansen and Lavita to manage their guest lists collaboratively.

**Architecture:** React (Vite) SPA with React Router for client-side routing. Firebase Firestore for real-time data sync, Firebase Auth for two named user accounts, Firebase Hosting for deployment. App shell with a home screen module grid; Guest List is the first module with 5 sub-tabs.

**Tech Stack:** React 18, Vite, React Router v6, Firebase v10 (Auth + Firestore), Vite PWA plugin, Vitest + React Testing Library, Tailwind CSS

---

## File Structure

```
src/
├── main.jsx                         # App entry point
├── App.jsx                          # Router setup
├── firebase.js                      # Firebase init + exports
├── hooks/
│   ├── useAuth.js                   # Auth state, current user, role
│   ├── useGuests.js                 # Firestore guests listener
│   └── useTags.js                   # Firestore tags listener
├── lib/
│   ├── guestUtils.js                # Weight calc, duplicate detection, linking
│   └── tagUtils.js                  # Tag color palette, weight helpers
├── components/
│   ├── layout/
│   │   ├── TopBar.jsx               # App name + current user name
│   │   ├── BottomNav.jsx            # Home / Guests / Updates / Settings
│   │   └── ModuleLayout.jsx         # Sub-tab bar + content wrapper
│   ├── ui/
│   │   ├── TagPill.jsx              # Colored pill with H/L superscript
│   │   ├── GuestRow.jsx             # Compact guest row (name, tags, weight, RSVP icons)
│   │   ├── RsvpIcons.jsx            # 📅 ✉️ ✅ icons with H/L state logic
│   │   ├── Toast.jsx                # Subtle confirmation toast
│   │   ├── BottomSheet.jsx          # Slide-up sheet for edit/create forms
│   │   └── FilterBar.jsx            # Tag filter pills + sort dropdown
│   └── guests/
│       ├── AddGuest.jsx             # Add tab: name input, suggestions, tags, weight, save
│       ├── GuestList.jsx            # My List + Their List tab (readOnly prop)
│       ├── CombinedList.jsx         # Combined tab with deduplicated view
│       ├── TagsManager.jsx          # Tags tab
│       ├── GuestEditSheet.jsx       # Edit sheet (bottom sheet) for existing guest
│       └── TagEditSheet.jsx         # Edit sheet for tag create/edit
├── pages/
│   ├── LoginPage.jsx                # Email/password login
│   ├── HomePage.jsx                 # Module grid (2×2)
│   └── GuestsPage.jsx               # Guest module shell with 5 sub-tabs
tests/
├── lib/
│   ├── guestUtils.test.js
│   └── tagUtils.test.js
├── components/
│   ├── ui/
│   │   ├── TagPill.test.jsx
│   │   ├── GuestRow.test.jsx
│   │   └── RsvpIcons.test.jsx
│   └── guests/
│       ├── AddGuest.test.jsx
│       ├── GuestList.test.jsx
│       ├── CombinedList.test.jsx
│       └── TagsManager.test.jsx
└── hooks/
    ├── useAuth.test.js
    ├── useGuests.test.js
    └── useTags.test.js
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`

- [ ] **Step 1: Scaffold Vite + React project**

```bash
cd /Users/i354601/Documents/git/weddingApp
npm create vite@latest . -- --template react
npm install
```

Expected: `node_modules/` created, dev server runnable.

- [ ] **Step 2: Install dependencies**

```bash
npm install firebase react-router-dom
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-plugin-pwa
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js` with:
```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#f9f0ff',
          100: '#f0e8ff',
          200: '#e0d0ff',
          500: '#9b59b6',
          600: '#7d3f9a',
          700: '#6a2f85',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Configure Vite with PWA + test**

Replace `vite.config.js` with:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Wedding Planner',
        short_name: 'Wedding',
        theme_color: '#9b59b6',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
  },
})
```

- [ ] **Step 5: Create test setup file**

Create `tests/setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add Tailwind to CSS entry**

Replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: Server running at `http://localhost:5173`

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Vite React app with Firebase, Tailwind, Vitest"
```

---

## Task 2: Firebase Setup

**Files:**
- Create: `src/firebase.js`
- Create: `.env.local` (not committed)
- Create: `.gitignore` entry for `.env.local`

- [ ] **Step 1: Create Firebase project**

1. Go to https://console.firebase.google.com
2. Click "Add project" → name it "wedding-planner"
3. Disable Google Analytics → Create project
4. Go to Project Settings → "Your apps" → Add Web app → name "wedding-web"
5. Copy the `firebaseConfig` object shown

- [ ] **Step 2: Enable Firestore**

In Firebase console: Build → Firestore Database → Create database → Start in **test mode** → choose region closest to you → Done.

- [ ] **Step 3: Enable Authentication**

In Firebase console: Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.

- [ ] **Step 4: Create two user accounts**

In Firebase console: Authentication → Users → Add user:
- Email: `hansen@wedding.local`, Password: (choose one, save it)
- Email: `lavita@wedding.local`, Password: (choose one, save it)

- [ ] **Step 5: Create environment file**

Create `.env.local` (replace values with your config from Step 1):
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

- [ ] **Step 6: Add to .gitignore**

Append to `.gitignore`:
```
.env.local
```

- [ ] **Step 7: Create firebase.js**

Create `src/firebase.js`:
```js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

- [ ] **Step 8: Commit**

```bash
git add src/firebase.js vite.config.js .gitignore
git commit -m "chore: add Firebase init (credentials via .env.local)"
```

---

## Task 3: Auth Hook + Login Page

**Files:**
- Create: `src/hooks/useAuth.js`
- Create: `src/pages/LoginPage.jsx`
- Create: `src/App.jsx`
- Test: `tests/hooks/useAuth.test.js`

- [ ] **Step 1: Write failing test for useAuth**

Create `tests/hooks/useAuth.test.js`:
```js
import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../src/firebase.js', () => ({
  auth: {},
  db: {},
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => { cb(null); return () => {} }),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
}))

import { useAuth } from '../src/hooks/useAuth.js'

describe('useAuth', () => {
  it('returns null user when not authenticated', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
    expect(result.current.loading).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/hooks/useAuth.test.js
```

Expected: FAIL — module not found

- [ ] **Step 3: Create useAuth.js**

Create `src/hooks/useAuth.js`:
```js
import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'hansen' | 'lavita'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setRole(snap.exists() ? snap.data().role : null)
        setUser(firebaseUser)
      } else {
        setUser(null)
        setRole(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout = () => signOut(auth)

  return { user, role, loading, login, logout }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/hooks/useAuth.test.js
```

Expected: PASS

- [ ] **Step 5: Create LoginPage**

Create `src/pages/LoginPage.jsx`:
```jsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💒</div>
          <h1 className="text-xl font-bold text-purple-600">Wedding Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Hansen & Lavita</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-purple-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-purple-600"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create App.jsx with routing**

Create `src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.js'
import LoginPage from './pages/LoginPage.jsx'
import HomePage from './pages/HomePage.jsx'
import GuestsPage from './pages/GuestsPage.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-purple-500">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/guests/*" element={<RequireAuth><GuestsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 7: Update main.jsx**

Replace `src/main.jsx`:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 8: Seed user profiles in Firestore**

In Firebase console → Firestore → Start collection `users`.
Add two documents manually (use the UID shown in Authentication → Users for each):

Document ID: `<hansen_uid>`
```
role: "hansen"
email: "hansen@wedding.local"
displayName: "Hansen"
```

Document ID: `<lavita_uid>`
```
role: "lavita"
email: "lavita@wedding.local"
displayName: "Lavita"
```

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: auth hook, login page, app routing"
```

---

## Task 4: App Shell — Layout Components

**Files:**
- Create: `src/components/layout/TopBar.jsx`
- Create: `src/components/layout/BottomNav.jsx`
- Create: `src/components/layout/ModuleLayout.jsx`
- Create: `src/pages/HomePage.jsx`

- [ ] **Step 1: Create TopBar**

Create `src/components/layout/TopBar.jsx`:
```jsx
import { useAuth } from '../../hooks/useAuth.js'

export default function TopBar({ title }) {
  const { role, logout } = useAuth()
  const displayName = role === 'hansen' ? 'Hansen' : role === 'lavita' ? 'Lavita' : ''

  return (
    <div className="bg-purple-500 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-lg">💒</span>
        <span className="font-semibold text-sm">{title || 'Wedding Planner'}</span>
      </div>
      <button
        onClick={logout}
        className="text-xs bg-purple-600 px-3 py-1 rounded-full"
      >
        {displayName} ↩
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create BottomNav**

Create `src/components/layout/BottomNav.jsx`:
```jsx
import { useNavigate, useLocation } from 'react-router-dom'

const items = [
  { label: 'Home', icon: '🏠', path: '/' },
  { label: 'Guests', icon: '👥', path: '/guests' },
  { label: 'Updates', icon: '🔔', path: null },
  { label: 'Settings', icon: '⚙️', path: null },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-10">
      {items.map(item => {
        const active = item.path && location.pathname.startsWith(item.path) &&
          (item.path === '/' ? location.pathname === '/' : true)
        return (
          <button
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            className={`flex flex-col items-center text-xs gap-0.5 px-3 ${active ? 'text-purple-500' : 'text-gray-400'} ${!item.path ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create ModuleLayout (sub-tab bar)**

Create `src/components/layout/ModuleLayout.jsx`:
```jsx
import { useNavigate, useLocation } from 'react-router-dom'

export default function ModuleLayout({ tabs, children }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
        {tabs.map(tab => {
          const active = location.pathname === tab.path ||
            (tab.path.endsWith('/guests') && location.pathname === '/guests')
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-1 px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-purple-500 text-purple-600 font-semibold'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-y-auto pb-16">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create HomePage**

Create `src/pages/HomePage.jsx`:
```jsx
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/layout/TopBar.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'

const modules = [
  { label: 'Guest List', icon: '👥', path: '/guests', active: true },
  { label: 'Budget', icon: '💰', path: null, active: false },
  { label: 'Vendors', icon: '🏪', path: null, active: false },
  { label: 'Timeline', icon: '📅', path: null, active: false },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-purple-50 flex flex-col">
      <TopBar title="Wedding Planner" />
      <div className="flex-1 p-4 pb-20">
        <p className="text-xs text-gray-500 mb-3">Your modules</p>
        <div className="grid grid-cols-2 gap-3">
          {modules.map(mod => (
            <button
              key={mod.label}
              onClick={() => mod.active && navigate(mod.path)}
              className={`rounded-2xl p-5 flex flex-col items-center gap-2 text-center shadow-sm transition-opacity ${
                mod.active
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-400 border-2 border-dashed border-gray-200 cursor-not-allowed'
              }`}
            >
              <span className="text-3xl">{mod.icon}</span>
              <span className="text-sm font-semibold">{mod.label}</span>
              {!mod.active && <span className="text-xs opacity-70">coming soon</span>}
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 5: Create GuestsPage shell**

Create `src/pages/GuestsPage.jsx`:
```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import TopBar from '../components/layout/TopBar.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import ModuleLayout from '../components/layout/ModuleLayout.jsx'
import AddGuest from '../components/guests/AddGuest.jsx'
import GuestList from '../components/guests/GuestList.jsx'
import CombinedList from '../components/guests/CombinedList.jsx'
import TagsManager from '../components/guests/TagsManager.jsx'

const TABS = [
  { path: '/guests', icon: '➕', label: 'Add' },
  { path: '/guests/list', icon: '👥', label: 'My List' },
  { path: '/guests/their-list', icon: '👁️', label: 'Their List' },
  { path: '/guests/combined', icon: '🔗', label: 'Combined' },
  { path: '/guests/tags', icon: '🏷️', label: 'Tags' },
]

export default function GuestsPage() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar title="Guest List" />
      <ModuleLayout tabs={TABS}>
        <Routes>
          <Route index element={<AddGuest />} />
          <Route path="list" element={<GuestList readOnly={false} />} />
          <Route path="their-list" element={<GuestList readOnly={true} />} />
          <Route path="combined" element={<CombinedList />} />
          <Route path="tags" element={<TagsManager />} />
          <Route path="*" element={<Navigate to="/guests" replace />} />
        </Routes>
      </ModuleLayout>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 6: Create stub components so app compiles**

Create `src/components/guests/AddGuest.jsx`:
```jsx
export default function AddGuest() { return <div className="p-4 text-sm text-gray-500">Add tab — coming in Task 7</div> }
```

Create `src/components/guests/GuestList.jsx`:
```jsx
export default function GuestList({ readOnly }) { return <div className="p-4 text-sm text-gray-500">{readOnly ? "Their List" : "My List"} — coming in Task 8</div> }
```

Create `src/components/guests/CombinedList.jsx`:
```jsx
export default function CombinedList() { return <div className="p-4 text-sm text-gray-500">Combined — coming in Task 9</div> }
```

Create `src/components/guests/TagsManager.jsx`:
```jsx
export default function TagsManager() { return <div className="p-4 text-sm text-gray-500">Tags — coming in Task 10</div> }
```

- [ ] **Step 7: Verify full app renders and navigation works**

```bash
npm run dev
```

Open http://localhost:5173 — login with Hansen credentials, verify home screen shows module grid, tap Guest List navigates to guests page, bottom nav works, sub-tabs switch.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: app shell — home screen, bottom nav, guest module layout"
```

---

## Task 5: Firestore Hooks — useGuests + useTags

**Files:**
- Create: `src/hooks/useGuests.js`
- Create: `src/hooks/useTags.js`
- Test: `tests/hooks/useGuests.test.js`
- Test: `tests/hooks/useTags.test.js`

- [ ] **Step 1: Write failing tests for useGuests**

Create `tests/hooks/useGuests.test.js`:
```js
import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../src/firebase.js', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  onSnapshot: vi.fn((q, cb) => {
    cb({ docs: [] })
    return () => {}
  }),
}))

import { useGuests } from '../src/hooks/useGuests.js'

describe('useGuests', () => {
  it('returns empty array initially', () => {
    const { result } = renderHook(() => useGuests())
    expect(result.current.guests).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/hooks/useGuests.test.js
```

Expected: FAIL

- [ ] **Step 3: Create useGuests.js**

Create `src/hooks/useGuests.js`:
```js
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
```

- [ ] **Step 4: Write failing tests for useTags**

Create `tests/hooks/useTags.test.js`:
```js
import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../src/firebase.js', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn((q, cb) => {
    cb({ docs: [] })
    return () => {}
  }),
}))

import { useTags } from '../src/hooks/useTags.js'

describe('useTags', () => {
  it('returns empty array initially', () => {
    const { result } = renderHook(() => useTags())
    expect(result.current.tags).toEqual([])
  })
})
```

- [ ] **Step 5: Create useTags.js**

Create `src/hooks/useTags.js`:
```js
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
```

- [ ] **Step 6: Run all hook tests**

```bash
npx vitest run tests/hooks/
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/ tests/hooks/
git commit -m "feat: useGuests and useTags Firestore hooks"
```

---

## Task 6: Pure Logic — guestUtils + tagUtils

**Files:**
- Create: `src/lib/guestUtils.js`
- Create: `src/lib/tagUtils.js`
- Test: `tests/lib/guestUtils.test.js`
- Test: `tests/lib/tagUtils.test.js`

- [ ] **Step 1: Write failing tests for guestUtils**

Create `tests/lib/guestUtils.test.js`:
```js
import { describe, it, expect } from 'vitest'
import {
  calcWeight,
  findDuplicates,
  deduplicateForCombined,
  sortGuests,
} from '../src/lib/guestUtils.js'

const mockTags = [
  { id: 't1', name: 'Family', weights: { u1: 9, u2: 8 } },
  { id: 't2', name: 'Friends', weights: { u1: 6, u2: 7 } },
]

describe('calcWeight', () => {
  it('returns max tag weight for user', () => {
    expect(calcWeight(['t1', 't2'], 'u1', mockTags, false, null)).toBe(9)
  })

  it('returns override weight when weightOverride is true', () => {
    expect(calcWeight(['t1'], 'u1', mockTags, true, 3)).toBe(3)
  })

  it('returns 5 when no tags selected', () => {
    expect(calcWeight([], 'u1', mockTags, false, null)).toBe(5)
  })
})

describe('findDuplicates', () => {
  it('returns guests with same name (case-insensitive) from different owners', () => {
    const guests = [
      { id: 'g1', name: 'John Smith', ownerId: 'u1' },
      { id: 'g2', name: 'john smith', ownerId: 'u2' },
      { id: 'g3', name: 'Jane Doe', ownerId: 'u1' },
    ]
    const result = findDuplicates('John Smith', 'u1', guests)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('g2')
  })

  it('does not flag same owner as duplicate', () => {
    const guests = [
      { id: 'g1', name: 'John Smith', ownerId: 'u1' },
    ]
    expect(findDuplicates('John Smith', 'u1', guests)).toHaveLength(0)
  })
})

describe('deduplicateForCombined', () => {
  it('merges exact-name guests from different owners into one entry', () => {
    const guests = [
      { id: 'g1', name: 'John Smith', ownerId: 'u1', tags: ['t1'], weight: 9, linkedGuestId: null, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g2', name: 'John Smith', ownerId: 'u2', tags: ['t2'], weight: 7, linkedGuestId: null, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ]
    const result = deduplicateForCombined(guests)
    expect(result).toHaveLength(1)
    expect(result[0].shared).toBe(true)
    expect(result[0].weight).toBe(9)
  })

  it('keeps unique guests as separate entries', () => {
    const guests = [
      { id: 'g1', name: 'Alice', ownerId: 'u1', tags: [], weight: 5, linkedGuestId: null, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g2', name: 'Bob', ownerId: 'u2', tags: [], weight: 5, linkedGuestId: null, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ]
    const result = deduplicateForCombined(guests)
    expect(result).toHaveLength(2)
    expect(result.every(g => !g.shared)).toBe(true)
  })
})

describe('sortGuests', () => {
  it('sorts by weight descending by default', () => {
    const guests = [{ weight: 3 }, { weight: 9 }, { weight: 6 }]
    expect(sortGuests(guests, 'weight').map(g => g.weight)).toEqual([9, 6, 3])
  })

  it('sorts by name A-Z', () => {
    const guests = [{ name: 'Zara', weight: 5 }, { name: 'Alice', weight: 5 }]
    expect(sortGuests(guests, 'name')[0].name).toBe('Alice')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/guestUtils.test.js
```

Expected: FAIL

- [ ] **Step 3: Create guestUtils.js**

Create `src/lib/guestUtils.js`:
```js
/**
 * Calculate effective weight for a guest.
 * Returns override if set, otherwise max tag weight for userId, or 5 if no tags.
 */
export function calcWeight(tagIds, userId, tags, weightOverride, overrideValue) {
  if (weightOverride && overrideValue !== null) return overrideValue
  if (!tagIds || tagIds.length === 0) return 5
  const weights = tagIds
    .map(id => tags.find(t => t.id === id))
    .filter(Boolean)
    .map(t => (t.weights && t.weights[userId]) ?? 5)
  return weights.length > 0 ? Math.max(...weights) : 5
}

/**
 * Find guests in allGuests with the same name (case-insensitive)
 * that belong to a different owner than currentUserId.
 */
export function findDuplicates(name, currentUserId, allGuests) {
  const normalized = name.trim().toLowerCase()
  return allGuests.filter(
    g => g.name.trim().toLowerCase() === normalized && g.ownerId !== currentUserId
  )
}

/**
 * Merge guest list for Combined view.
 * Guests with same name (case-insensitive) from different owners, or
 * manually linked guests, are merged into one entry with shared=true.
 * Returns array of combined entries sorted by weight desc.
 */
export function deduplicateForCombined(guests) {
  const seen = new Map() // normalizedName -> combined entry
  const result = []

  for (const guest of guests) {
    const key = guest.linkedGuestId
      ? `linked:${[guest.id, guest.linkedGuestId].sort().join('-')}`
      : guest.name.trim().toLowerCase()

    if (seen.has(key)) {
      const existing = seen.get(key)
      existing.shared = true
      existing.weight = Math.max(existing.weight, guest.weight)
      existing.owners.push(guest.ownerId)
      existing.allTags = [...existing.allTags, ...guest.tags.map(t => ({ tagId: t, ownerId: guest.ownerId }))]
      existing.rsvp.confirmed = existing.rsvp.confirmed || guest.rsvp.confirmed
    } else {
      const entry = {
        ...guest,
        shared: false,
        owners: [guest.ownerId],
        allTags: guest.tags.map(t => ({ tagId: t, ownerId: guest.ownerId })),
      }
      seen.set(key, entry)
      result.push(entry)
    }
  }

  return result
}

/**
 * Sort guests array by 'weight' (desc) or 'name' (asc).
 */
export function sortGuests(guests, sortBy = 'weight') {
  return [...guests].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    return b.weight - a.weight
  })
}
```

- [ ] **Step 4: Write failing tests for tagUtils**

Create `tests/lib/tagUtils.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { TAG_COLORS, getTagColor, getTagWeight } from '../src/lib/tagUtils.js'

describe('TAG_COLORS', () => {
  it('is a non-empty array of hex colors', () => {
    expect(Array.isArray(TAG_COLORS)).toBe(true)
    expect(TAG_COLORS.length).toBeGreaterThan(0)
    expect(TAG_COLORS[0]).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
})

describe('getTagColor', () => {
  it('returns color string for a tag', () => {
    const tag = { color: '#e8f4e8' }
    expect(getTagColor(tag)).toBe('#e8f4e8')
  })

  it('returns default color when tag has no color', () => {
    expect(getTagColor({})).toBe(TAG_COLORS[0])
  })
})

describe('getTagWeight', () => {
  it('returns the user-specific weight for a tag', () => {
    const tag = { weights: { u1: 7, u2: 4 } }
    expect(getTagWeight(tag, 'u1')).toBe(7)
  })

  it('returns 5 when user has no weight set', () => {
    const tag = { weights: {} }
    expect(getTagWeight(tag, 'u1')).toBe(5)
  })
})
```

- [ ] **Step 5: Create tagUtils.js**

Create `src/lib/tagUtils.js`:
```js
export const TAG_COLORS = [
  '#e8f4e8', '#e8e8f4', '#f4e8e8', '#fef9e8', '#f4f0ff',
  '#e8f4f8', '#fde8f4', '#f0f4e8', '#fff0e8', '#e8fff0',
]

export function getTagColor(tag) {
  return tag.color || TAG_COLORS[0]
}

export function getTagWeight(tag, userId) {
  return (tag.weights && tag.weights[userId]) ?? 5
}
```

- [ ] **Step 6: Run all lib tests**

```bash
npx vitest run tests/lib/
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/ tests/lib/
git commit -m "feat: guest and tag utility functions with tests"
```

---

## Task 7: UI Components — TagPill, GuestRow, RsvpIcons, Toast, FilterBar

**Files:**
- Create: `src/components/ui/TagPill.jsx`
- Create: `src/components/ui/RsvpIcons.jsx`
- Create: `src/components/ui/GuestRow.jsx`
- Create: `src/components/ui/Toast.jsx`
- Create: `src/components/ui/FilterBar.jsx`
- Create: `src/components/ui/BottomSheet.jsx`
- Test: `tests/components/ui/TagPill.test.jsx`
- Test: `tests/components/ui/RsvpIcons.test.jsx`
- Test: `tests/components/ui/GuestRow.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/ui/TagPill.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TagPill from '../../../src/components/ui/TagPill.jsx'

describe('TagPill', () => {
  it('renders tag name', () => {
    render(<TagPill tag={{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H' }} />)
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('shows H/L superscript', () => {
    render(<TagPill tag={{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H' }} />)
    expect(screen.getByText('H')).toBeInTheDocument()
  })
})
```

Create `tests/components/ui/RsvpIcons.test.jsx`:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RsvpIcons from '../../../src/components/ui/RsvpIcons.jsx'

const baseRsvp = {
  hansen: { saveTheDateSent: true, inviteSent: false },
  lavita: { saveTheDateSent: false, inviteSent: false },
  confirmed: false,
}

describe('RsvpIcons', () => {
  it('renders 3 icons', () => {
    render(<RsvpIcons rsvp={baseRsvp} currentRole="hansen" readOnly={true} onToggle={() => {}} />)
    expect(screen.getAllByRole('button').length + screen.getAllByTitle(/sent|confirmed/i).length).toBeGreaterThanOrEqual(0)
    // Icons are rendered as spans/buttons
    expect(screen.getByTitle('Save the date')).toBeInTheDocument()
    expect(screen.getByTitle('Invite')).toBeInTheDocument()
    expect(screen.getByTitle('Confirmed')).toBeInTheDocument()
  })

  it('calls onToggle with correct field when save-the-date icon clicked', () => {
    const onToggle = vi.fn()
    render(<RsvpIcons rsvp={baseRsvp} currentRole="hansen" readOnly={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByTitle('Save the date'))
    expect(onToggle).toHaveBeenCalledWith('saveTheDateSent')
  })

  it('calls onToggle with confirmed when confirmed icon clicked', () => {
    const onToggle = vi.fn()
    render(<RsvpIcons rsvp={baseRsvp} currentRole="hansen" readOnly={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByTitle('Confirmed'))
    expect(onToggle).toHaveBeenCalledWith('confirmed')
  })
})
```

Create `tests/components/ui/GuestRow.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GuestRow from '../../../src/components/ui/GuestRow.jsx'

const guest = {
  id: 'g1',
  name: 'John Smith',
  tags: ['t1'],
  weight: 8,
  rsvp: {
    hansen: { saveTheDateSent: false, inviteSent: false },
    lavita: { saveTheDateSent: false, inviteSent: false },
    confirmed: false,
  },
  ownerId: 'u1',
}
const tags = [{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H', weights: {} }]

describe('GuestRow', () => {
  it('renders guest name', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('renders weight', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/ui/
```

Expected: FAIL

- [ ] **Step 3: Create TagPill**

Create `src/components/ui/TagPill.jsx`:
```jsx
export default function TagPill({ tag, selected, onClick }) {
  const bg = selected ? '#9b59b6' : tag.color || '#f0e8ff'
  const textColor = selected ? '#ffffff' : '#9b59b6'

  return (
    <button
      onClick={onClick}
      className="inline-flex items-baseline gap-0.5 px-2 py-0.5 rounded-full text-xs transition-colors"
      style={{ backgroundColor: bg, color: textColor }}
    >
      {tag.name}
      {tag.createdByInitial && (
        <sup className="text-[8px] opacity-70">{tag.createdByInitial}</sup>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Create RsvpIcons**

Create `src/components/ui/RsvpIcons.jsx`:
```jsx
export default function RsvpIcons({ rsvp, currentRole, readOnly, onToggle }) {
  const partnerRole = currentRole === 'hansen' ? 'lavita' : 'hansen'
  const partnerInitial = currentRole === 'hansen' ? 'L' : 'H'
  const currentInitial = currentRole === 'hansen' ? 'H' : 'L'

  const currentStd = rsvp[currentRole]?.saveTheDateSent
  const partnerStd = rsvp[partnerRole]?.saveTheDateSent
  const currentInvite = rsvp[currentRole]?.inviteSent
  const partnerInvite = rsvp[partnerRole]?.inviteSent

  function IconButton({ title, emoji, active, partnerActive, field }) {
    const isConfirmed = field === 'confirmed'
    const opacity = (isConfirmed ? rsvp.confirmed : active) ? 'opacity-100' : 'opacity-25'

    return (
      <button
        title={title}
        disabled={readOnly}
        onClick={() => !readOnly && onToggle(field)}
        className={`flex flex-col items-center ${opacity} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <span className="text-base leading-none">{emoji}</span>
        {!isConfirmed && (
          <span className="text-[8px] leading-none text-gray-400">
            {active ? currentInitial : '·'}{partnerActive ? partnerInitial : '·'}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex gap-1 items-center">
      <IconButton title="Save the date" emoji="📅" active={currentStd} partnerActive={partnerStd} field="saveTheDateSent" />
      <IconButton title="Invite" emoji="✉️" active={currentInvite} partnerActive={partnerInvite} field="inviteSent" />
      <IconButton title="Confirmed" emoji="✅" active={rsvp.confirmed} partnerActive={false} field="confirmed" />
    </div>
  )
}
```

- [ ] **Step 5: Create GuestRow**

Create `src/components/ui/GuestRow.jsx`:
```jsx
import TagPill from './TagPill.jsx'
import RsvpIcons from './RsvpIcons.jsx'

export default function GuestRow({ guest, tags, currentRole, readOnly, onRsvpToggle, onEdit, badge }) {
  const guestTags = (guest.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean)

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 ${!readOnly ? 'cursor-pointer active:bg-purple-50' : ''}`}
      onClick={!readOnly ? onEdit : undefined}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium text-sm truncate">{guest.name}</span>
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={badge.style}>{badge.label}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {guestTags.map(tag => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </div>
      <span className="text-purple-500 font-bold text-sm w-5 text-center">{guest.weight}</span>
      <RsvpIcons
        rsvp={guest.rsvp}
        currentRole={currentRole}
        readOnly={readOnly}
        onToggle={field => onRsvpToggle(guest.id, field)}
      />
    </div>
  )
}
```

- [ ] **Step 6: Create Toast**

Create `src/components/ui/Toast.jsx`:
```jsx
import { useEffect, useState } from 'react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.() }, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">
      {message}
    </div>
  )
}
```

- [ ] **Step 7: Create FilterBar**

Create `src/components/ui/FilterBar.jsx`:
```jsx
export default function FilterBar({ tags, activeTag, onTagChange, sortBy, onSortChange }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 overflow-x-auto">
      <button
        onClick={() => onTagChange(null)}
        className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${!activeTag ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
      >
        All
      </button>
      {tags.map(tag => (
        <button
          key={tag.id}
          onClick={() => onTagChange(tag.id)}
          className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${activeTag === tag.id ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {tag.name}
        </button>
      ))}
      <select
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
        className="ml-auto text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
      >
        <option value="weight">Weight ↓</option>
        <option value="name">Name A–Z</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 8: Create BottomSheet**

Create `src/components/ui/BottomSheet.jsx`:
```jsx
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
```

- [ ] **Step 9: Run UI tests**

```bash
npx vitest run tests/components/ui/
```

Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add src/components/ui/ tests/components/ui/
git commit -m "feat: UI components — TagPill, GuestRow, RsvpIcons, Toast, FilterBar, BottomSheet"
```

---

## Task 8: Add Guest Tab

**Files:**
- Modify: `src/components/guests/AddGuest.jsx`
- Test: `tests/components/guests/AddGuest.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/guests/AddGuest.test.jsx`:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({ guests: [] }),
}))
vi.mock('../../src/hooks/useTags.js', () => ({
  useTags: () => ({ tags: [{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H', weights: { u1: 9 } }] }),
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-guest' }),
  serverTimestamp: vi.fn(() => 'ts'),
}))
vi.mock('../../src/firebase.js', () => ({ db: {} }))

import AddGuest from '../../src/components/guests/AddGuest.jsx'

describe('AddGuest', () => {
  it('renders name input', () => {
    render(<AddGuest />)
    expect(screen.getByPlaceholderText(/guest name/i)).toBeInTheDocument()
  })

  it('renders tag pills', () => {
    render(<AddGuest />)
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('shows Save + Add Next button', () => {
    render(<AddGuest />)
    expect(screen.getByText(/save \+ add next/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/guests/AddGuest.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Implement AddGuest**

Replace `src/components/guests/AddGuest.jsx`:
```jsx
import { useState, useRef, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { calcWeight, findDuplicates } from '../../lib/guestUtils.js'
import TagPill from '../ui/TagPill.jsx'
import Toast from '../ui/Toast.jsx'

export default function AddGuest() {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()

  const [name, setName] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [weightOverride, setWeightOverride] = useState(false)
  const [overrideValue, setOverrideValue] = useState(null)
  const [editingWeight, setEditingWeight] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [toast, setToast] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [linkedGuestId, setLinkedGuestId] = useState(null)
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const effectiveWeight = calcWeight(selectedTags, user?.uid, tags, weightOverride, overrideValue)

  function handleNameChange(val) {
    setName(val)
    setLinkedGuestId(null)
    if (val.length < 2) { setSuggestions([]); setDuplicateWarning(null); return }
    const lower = val.toLowerCase()
    const matches = guests.filter(g => g.name.toLowerCase().includes(lower))
    setSuggestions(matches.slice(0, 5))
    const dups = findDuplicates(val, user?.uid, guests)
    setDuplicateWarning(dups.length > 0 ? dups[0] : null)
  }

  function toggleTag(tagId) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
    setWeightOverride(false)
  }

  async function handleSave() {
    if (!name.trim()) return
    await addDoc(collection(db, 'guests'), {
      name: name.trim(),
      ownerId: user.uid,
      tags: selectedTags,
      weight: effectiveWeight,
      weightOverride,
      linkedGuestId: linkedGuestId || null,
      rsvp: {
        hansen: { saveTheDateSent: false, inviteSent: false },
        lavita: { saveTheDateSent: false, inviteSent: false },
        confirmed: false,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    setToast(`${name.trim()} added`)
    setName('')
    setWeightOverride(false)
    setOverrideValue(null)
    setLinkedGuestId(null)
    setSuggestions([])
    setDuplicateWarning(null)
    nameRef.current?.focus()
  }

  async function handleAddNewTag() {
    if (!newTagName.trim()) return
    await addDoc(collection(db, 'tags'), {
      name: newTagName.trim(),
      createdBy: user.uid,
      createdByInitial: role === 'hansen' ? 'H' : 'L',
      weights: { [user.uid]: 5 },
      color: '#f0e8ff',
    })
    setNewTagName('')
    setAddingTag(false)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Name input */}
      <div>
        <input
          ref={nameRef}
          type="text"
          placeholder="Guest name..."
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="border border-purple-200 rounded-lg mt-1 bg-white shadow-sm overflow-hidden">
            {suggestions.map(g => {
              const gTags = (g.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean)
              return (
                <button
                  key={g.id}
                  onClick={() => { setName(g.name); setSuggestions([]) }}
                  className="w-full text-left px-3 py-2 text-sm border-b last:border-0 border-gray-100 hover:bg-purple-50 flex items-center justify-between"
                >
                  <span>{g.name} {gTags.map(t => <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full ml-1" style={{ backgroundColor: t.color }}>{t.name}</span>)}</span>
                  <span className="text-xs text-purple-500">{g.ownerId === user?.uid ? 'Your list' : 'Their list'}</span>
                </button>
              )
            })}
          </div>
        )}
        {/* Duplicate warning */}
        {duplicateWarning && !linkedGuestId && (
          <div className="mt-1 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 flex items-center justify-between">
            <span>"{duplicateWarning.name}" exists in partner's list — same person?</span>
            <button onClick={() => setLinkedGuestId(duplicateWarning.id)} className="ml-2 text-purple-600 underline">Link</button>
          </div>
        )}
        {linkedGuestId && (
          <div className="mt-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 flex items-center justify-between">
            <span>Linked as same person ✓</span>
            <button onClick={() => setLinkedGuestId(null)} className="text-gray-500 underline">Undo</button>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Tags</p>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <TagPill
              key={tag.id}
              tag={tag}
              selected={selectedTags.includes(tag.id)}
              onClick={() => toggleTag(tag.id)}
            />
          ))}
          {addingTag ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNewTag()}
                placeholder="Tag name..."
                className="border border-gray-300 rounded-full px-2 py-0.5 text-xs w-24 focus:outline-none"
              />
              <button onClick={handleAddNewTag} className="text-xs text-purple-500">Add</button>
              <button onClick={() => setAddingTag(false)} className="text-xs text-gray-400">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-500"
            >
              + new
            </button>
          )}
        </div>
      </div>

      {/* Weight */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Weight</span>
        {editingWeight ? (
          <input
            autoFocus
            type="number"
            min="1" max="10"
            value={overrideValue ?? effectiveWeight}
            onChange={e => { setOverrideValue(Number(e.target.value)); setWeightOverride(true) }}
            onBlur={() => setEditingWeight(false)}
            className="w-14 border border-purple-300 rounded px-2 py-0.5 text-sm text-center"
          />
        ) : (
          <button
            onClick={() => setEditingWeight(true)}
            className="bg-purple-100 text-purple-600 font-bold px-3 py-0.5 rounded-lg text-sm"
          >
            {effectiveWeight}
          </button>
        )}
        {!weightOverride && <span className="text-xs text-gray-400">auto from tags · tap to override</span>}
        {weightOverride && <button onClick={() => { setWeightOverride(false); setOverrideValue(null) }} className="text-xs text-gray-400 underline">reset</button>}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!name.trim()}
        className="w-full bg-purple-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
      >
        Save + Add Next
      </button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/components/guests/AddGuest.test.jsx
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/guests/AddGuest.jsx tests/components/guests/
git commit -m "feat: Add Guest tab with name suggestions, duplicate detection, tag picker, weight"
```

---

## Task 9: My List + Their List Tabs + Guest Edit Sheet

**Files:**
- Modify: `src/components/guests/GuestList.jsx`
- Create: `src/components/guests/GuestEditSheet.jsx`
- Test: `tests/components/guests/GuestList.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/guests/GuestList.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({
    guests: [
      { id: 'g1', name: 'Alice', ownerId: 'u1', tags: [], weight: 8, linkedGuestId: null,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ],
  }),
}))
vi.mock('../../src/hooks/useTags.js', () => ({
  useTags: () => ({ tags: [] }),
}))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn() }))
vi.mock('../../src/firebase.js', () => ({ db: {} }))

import GuestList from '../../src/components/guests/GuestList.jsx'

describe('GuestList', () => {
  it('shows current user guests in My List', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows partner guests in Their List (readOnly)', () => {
    render(<GuestList readOnly={true} />)
    // partner is lavita (u2), no guests — shows empty state
    expect(screen.getByText(/no guests/i)).toBeInTheDocument()
  })

  it('shows count in header', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByText(/my list \(1\)/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/guests/GuestList.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Create GuestEditSheet**

Create `src/components/guests/GuestEditSheet.jsx`:
```jsx
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
            <button onClick={() => { setWeightOverride(false); setOverrideValue(null) }} className="text-xs text-gray-400 underline">reset</button>
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
          <button onClick={handleSave} className="flex-1 bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold">Save</button>
          <button onClick={handleDelete} className="px-4 border border-red-300 text-red-500 rounded-xl text-sm">Delete</button>
        </div>
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 4: Implement GuestList**

Replace `src/components/guests/GuestList.jsx`:
```jsx
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { sortGuests } from '../../lib/guestUtils.js'
import GuestRow from '../ui/GuestRow.jsx'
import FilterBar from '../ui/FilterBar.jsx'
import GuestEditSheet from './GuestEditSheet.jsx'

export default function GuestList({ readOnly }) {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('weight')
  const [editingGuest, setEditingGuest] = useState(null)

  const partnerRole = role === 'hansen' ? 'lavita' : 'hansen'
  const partnerName = role === 'hansen' ? 'Lavita' : 'Hansen'

  // My List shows current user's guests; Their List shows partner's
  const myGuests = guests.filter(g => readOnly
    ? g.ownerId !== user?.uid
    : g.ownerId === user?.uid
  )

  const filtered = activeTag ? myGuests.filter(g => g.tags?.includes(activeTag)) : myGuests
  const sorted = sortGuests(filtered, sortBy)
  const listName = readOnly ? `${partnerName}'s List` : 'My List'

  async function handleRsvpToggle(guestId, field) {
    if (readOnly) return
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    const rsvp = { ...guest.rsvp }
    if (field === 'confirmed') {
      rsvp.confirmed = !rsvp.confirmed
    } else {
      rsvp[role] = { ...rsvp[role], [field]: !rsvp[role]?.[field] }
    }
    await updateDoc(doc(db, 'guests', guestId), { rsvp, updatedAt: serverTimestamp() })
  }

  return (
    <div>
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
        <span className="text-sm font-semibold text-purple-700">{listName} ({sorted.length})</span>
      </div>
      <FilterBar tags={tags} activeTag={activeTag} onTagChange={setActiveTag} sortBy={sortBy} onSortChange={setSortBy} />
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No guests yet</p>
      ) : (
        sorted.map(guest => (
          <GuestRow
            key={guest.id}
            guest={guest}
            tags={tags}
            currentRole={role}
            readOnly={readOnly}
            onRsvpToggle={handleRsvpToggle}
            onEdit={() => !readOnly && setEditingGuest(guest)}
          />
        ))
      )}
      {editingGuest && (
        <GuestEditSheet
          guest={editingGuest}
          tags={tags}
          userId={user?.uid}
          role={role}
          open={!!editingGuest}
          onClose={() => setEditingGuest(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/components/guests/GuestList.test.jsx
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/guests/ tests/components/guests/
git commit -m "feat: My List, Their List tabs, guest edit/delete sheet"
```

---

## Task 10: Combined Tab

**Files:**
- Modify: `src/components/guests/CombinedList.jsx`
- Test: `tests/components/guests/CombinedList.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/guests/CombinedList.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({
    guests: [
      { id: 'g1', name: 'Alice', ownerId: 'u1', tags: [], weight: 8, linkedGuestId: null,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g2', name: 'Alice', ownerId: 'u2', tags: [], weight: 6, linkedGuestId: null,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g3', name: 'Bob', ownerId: 'u1', tags: [], weight: 5, linkedGuestId: null,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ],
  }),
}))
vi.mock('../../src/hooks/useTags.js', () => ({ useTags: () => ({ tags: [] }) }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock('../../src/firebase.js', () => ({ db: {} }))

import CombinedList from '../../src/components/guests/CombinedList.jsx'

describe('CombinedList', () => {
  it('shows total unique count (2 not 3)', () => {
    render(<CombinedList />)
    expect(screen.getByText(/2 total/i)).toBeInTheDocument()
  })

  it('shows shared count badge', () => {
    render(<CombinedList />)
    expect(screen.getByText(/1 shared/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/guests/CombinedList.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Implement CombinedList**

Replace `src/components/guests/CombinedList.jsx`:
```jsx
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { deduplicateForCombined, sortGuests } from '../../lib/guestUtils.js'
import GuestRow from '../ui/GuestRow.jsx'
import FilterBar from '../ui/FilterBar.jsx'

export default function CombinedList() {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('weight')
  const [filterOwner, setFilterOwner] = useState('all')
  const [limit, setLimit] = useState('')
  const [editingLimit, setEditingLimit] = useState(false)

  const combined = deduplicateForCombined(guests)
  const sharedCount = combined.filter(g => g.shared).length

  let filtered = combined
  if (filterOwner === 'hansen') filtered = combined.filter(g => g.owners.includes(guests.find(x => x.id === g.id && x.ownerId)?.ownerId))
  if (filterOwner === 'shared') filtered = combined.filter(g => g.shared)

  // Apply active tag filter
  if (activeTag) filtered = filtered.filter(g => g.tags?.includes(activeTag) || g.allTags?.some(t => t.tagId === activeTag))

  const sorted = sortGuests(filtered, sortBy)
  const inviteLimit = limit ? parseInt(limit, 10) : null

  async function handleRsvpToggle(guestId, field) {
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    const rsvp = { ...guest.rsvp }
    if (field === 'confirmed') {
      rsvp.confirmed = !rsvp.confirmed
    } else {
      rsvp[role] = { ...rsvp[role], [field]: !rsvp[role]?.[field] }
    }
    await updateDoc(doc(db, 'guests', guestId), { rsvp, updatedAt: serverTimestamp() })
  }

  function getBadge(entry) {
    if (entry.shared) return { label: '★', style: { backgroundColor: '#f39c12', color: '#fff' } }
    const ownerIsCurrentUser = entry.ownerId === user?.uid
    const initial = ownerIsCurrentUser
      ? (role === 'hansen' ? 'H' : 'L')
      : (role === 'hansen' ? 'L' : 'H')
    const style = ownerIsCurrentUser
      ? { backgroundColor: '#e0d0f0', color: '#9b59b6' }
      : { backgroundColor: '#f0d0e8', color: '#c0369b' }
    return { label: initial, style }
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-700">{combined.length} total</span>
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{sharedCount} shared ★</span>
      </div>

      {/* Invite limit */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xs text-gray-500">Invite limit:</span>
        {editingLimit ? (
          <input
            autoFocus type="number" min="1"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            onBlur={() => setEditingLimit(false)}
            className="w-20 border border-gray-300 rounded px-2 py-0.5 text-xs"
          />
        ) : (
          <button onClick={() => setEditingLimit(true)} className="text-xs text-purple-500 underline">
            {limit || 'Set limit'}
          </button>
        )}
        {limit && <button onClick={() => setLimit('')} className="text-xs text-gray-400">✕</button>}
      </div>

      {/* Owner filter pills */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-100 overflow-x-auto">
        {['all', 'hansen', 'lavita', 'shared'].map(f => (
          <button
            key={f}
            onClick={() => setFilterOwner(f)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap capitalize ${filterOwner === f ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {f === 'shared' ? '★ Shared' : f === 'all' ? 'All' : f === 'hansen' ? 'Hansen' : 'Lavita'}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="ml-auto text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
        >
          <option value="weight">Weight ↓</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No guests yet</p>
      ) : (
        sorted.map((entry, idx) => {
          const overLimit = inviteLimit && idx >= inviteLimit
          return (
            <div key={entry.id} className={overLimit ? 'opacity-40 line-through' : ''}>
              <GuestRow
                guest={entry}
                tags={tags}
                currentRole={role}
                readOnly={false}
                onRsvpToggle={handleRsvpToggle}
                onEdit={() => {}}
                badge={getBadge(entry)}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/components/guests/CombinedList.test.jsx
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/guests/CombinedList.jsx tests/components/guests/
git commit -m "feat: Combined tab with deduplication, shared badge, invite limit"
```

---

## Task 11: Tags Tab

**Files:**
- Modify: `src/components/guests/TagsManager.jsx`
- Create: `src/components/guests/TagEditSheet.jsx`
- Test: `tests/components/guests/TagsManager.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/guests/TagsManager.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({
    guests: [
      { id: 'g1', tags: ['t1'], ownerId: 'u1', weight: 5, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ],
  }),
}))
vi.mock('../../src/hooks/useTags.js', () => ({
  useTags: () => ({
    tags: [{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H', weights: { u1: 9 } }],
  }),
}))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), collection: vi.fn(), addDoc: vi.fn() }))
vi.mock('../../src/firebase.js', () => ({ db: {} }))

import TagsManager from '../../src/components/guests/TagsManager.jsx'

describe('TagsManager', () => {
  it('shows tag name', () => {
    render(<TagsManager />)
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('shows guest count for tag', () => {
    render(<TagsManager />)
    expect(screen.getByText(/1 guest/i)).toBeInTheDocument()
  })

  it('shows weight for current user', () => {
    render(<TagsManager />)
    expect(screen.getByText('w: 9')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/guests/TagsManager.test.jsx
```

Expected: FAIL

- [ ] **Step 3: Create TagEditSheet**

Create `src/components/guests/TagEditSheet.jsx`:
```jsx
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
  }

  async function handleDelete() {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from all guests.`)) return
    await deleteDoc(doc(db, 'tags', tag.id))
    onClose()
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
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-purple-500' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} className="flex-1 bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold">
            {isNew ? 'Create Tag' : 'Save'}
          </button>
          {!isNew && (
            <button onClick={handleDelete} className="px-4 border border-red-300 text-red-500 rounded-xl text-sm">Delete</button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 4: Implement TagsManager**

Replace `src/components/guests/TagsManager.jsx`:
```jsx
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { getTagWeight } from '../../lib/tagUtils.js'
import TagEditSheet from './TagEditSheet.jsx'

export default function TagsManager() {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [editingTag, setEditingTag] = useState(null)
  const [creatingTag, setCreatingTag] = useState(false)

  function guestCountForTag(tagId) {
    return guests.filter(g => g.tags?.includes(tagId)).length
  }

  return (
    <div>
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-700">Tags</span>
        <button
          onClick={() => setCreatingTag(true)}
          className="text-xs bg-purple-500 text-white px-3 py-1 rounded-full"
        >
          + New Tag
        </button>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No tags yet — create one above</p>
      ) : (
        tags.map(tag => {
          const count = guestCountForTag(tag.id)
          const myWeight = getTagWeight(tag, user?.uid)
          return (
            <button
              key={tag.id}
              onClick={() => setEditingTag(tag)}
              className="w-full flex items-center gap-3 px-3 py-3 border-b border-gray-100 text-left hover:bg-purple-50"
            >
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: tag.color || '#f0e8ff', color: '#555' }}
              >
                {tag.name}
                {tag.createdByInitial && <sup className="text-[8px] ml-0.5 opacity-60">{tag.createdByInitial}</sup>}
              </span>
              <span className="text-xs text-gray-400 flex-1">{count} guest{count !== 1 ? 's' : ''}</span>
              <span className="text-xs font-semibold text-purple-600">w: {myWeight}</span>
            </button>
          )
        })
      )}

      {editingTag && (
        <TagEditSheet
          tag={editingTag}
          userId={user?.uid}
          role={role}
          open={!!editingTag}
          onClose={() => setEditingTag(null)}
        />
      )}
      {creatingTag && (
        <TagEditSheet
          tag={null}
          userId={user?.uid}
          role={role}
          open={creatingTag}
          onClose={() => setCreatingTag(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/components/guests/TagsManager.test.jsx
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/guests/ tests/components/guests/
git commit -m "feat: Tags tab with create/edit/delete and per-user weights"
```

---

## Task 12: Firestore Security Rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Create security rules**

Create `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Only authenticated users can read/write
    function isAuth() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read, write: if isAuth();
    }

    match /guests/{guestId} {
      allow read, write: if isAuth();
    }

    match /tags/{tagId} {
      allow read, write: if isAuth();
    }
  }
}
```

- [ ] **Step 2: Install Firebase CLI and deploy rules**

```bash
npm install -g firebase-tools
firebase login
firebase init firestore  # select existing project, accept defaults for rules file
firebase deploy --only firestore:rules
```

Expected: `Deploy complete!`

- [ ] **Step 3: Commit**

```bash
git add firestore.rules .firebaserc firebase.json
git commit -m "chore: Firestore security rules — auth required for all collections"
```

---

## Task 13: Deploy to Firebase Hosting

**Files:**
- Create: `firebase.json` (hosting section)

- [ ] **Step 1: Build for production**

```bash
npm run build
```

Expected: `dist/` folder created, no errors.

- [ ] **Step 2: Init and configure Firebase Hosting**

```bash
firebase init hosting
```

When prompted:
- Public directory: `dist`
- Single-page app: **Yes**
- Overwrite `dist/index.html`: **No**

- [ ] **Step 3: Deploy**

```bash
firebase deploy --only hosting
```

Expected: Output includes `Hosting URL: https://your-project.web.app`

- [ ] **Step 4: Open on phone**

Open the Hosting URL on both Hansen's and Lavita's phones. Log in with respective credentials. Verify real-time sync: add a guest on one phone, see it appear on the other.

- [ ] **Step 5: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "chore: Firebase Hosting deployment config"
```

---

## Task 14: Run Full Test Suite + Final Check

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS, no failures.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Manual smoke test checklist**

- [ ] Login as Hansen → home screen shows module grid
- [ ] Tap Guest List → Add tab opens, name input auto-focused
- [ ] Type a name → suggestions appear
- [ ] Select tags → weight auto-updates
- [ ] Save guest → toast appears, form clears
- [ ] Add same name as partner → duplicate warning appears, Link works
- [ ] My List tab → guest appears, RSVP icons tappable
- [ ] Their List tab → read-only, no edit on tap
- [ ] Combined tab → shared guest shown once with ★, set invite limit dims lower-weight guests
- [ ] Tags tab → create tag with weight/color, edit weight for self
- [ ] Login as Lavita on another browser tab → see Hansen's guests in Their List, real-time sync works

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: full test suite passing, app ready for use"
```
