import { useAuthContext } from '../../contexts/AuthContext.jsx'

export default function TopBar({ title }) {
  const { role, logout } = useAuthContext()
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
