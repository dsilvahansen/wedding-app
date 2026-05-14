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
