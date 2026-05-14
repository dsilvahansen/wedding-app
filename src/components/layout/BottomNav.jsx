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
