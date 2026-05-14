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
