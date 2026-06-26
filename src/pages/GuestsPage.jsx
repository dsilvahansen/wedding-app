import { Routes, Route, Navigate } from 'react-router-dom'
import TopBar from '../components/layout/TopBar.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import ModuleLayout from '../components/layout/ModuleLayout.jsx'
import GuestList from '../components/guests/GuestList.jsx'
import CombinedList from '../components/guests/CombinedList.jsx'
import TagsManager from '../components/guests/TagsManager.jsx'
import { useGuests } from '../hooks/useGuests.js'
import { useTags } from '../hooks/useTags.js'

const TABS = [
  { path: '/guests/list', icon: '👥', label: 'My List' },
  { path: '/guests/their-list', icon: '👁️', label: 'Their List' },
  { path: '/guests/combined', icon: '🔗', label: 'Combined' },
  { path: '/guests/tags', icon: '🏷️', label: 'Tags' },
]

export default function GuestsPage() {
  const guests = useGuests()
  const tags = useTags()

  return (
    <div className="h-screen flex flex-col">
      <TopBar title="Guest List" guests={guests} tags={tags} />
      <div className="flex-1 flex flex-col overflow-hidden">
      <ModuleLayout tabs={TABS}>
        <Routes>
          <Route index element={<Navigate to="/guests/list" replace />} />
          <Route path="list" element={<GuestList readOnly={false} />} />
          <Route path="their-list" element={<GuestList readOnly={true} />} />
          <Route path="combined" element={<CombinedList />} />
          <Route path="tags" element={<TagsManager />} />
          <Route path="*" element={<Navigate to="/guests/list" replace />} />
        </Routes>
      </ModuleLayout>
      </div>
      <BottomNav />
    </div>
  )
}
