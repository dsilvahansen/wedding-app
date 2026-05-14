import { useNavigate, useLocation } from 'react-router-dom'

export default function ModuleLayout({ tabs, children }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
        {tabs.map(tab => {
          const active = location.pathname === tab.path
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
