import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/history', label: '记录', icon: '📊' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

export default function Layout() {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#1a1a2e]">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 z-50" style={{ paddingBottom: 'var(--safe-area-bottom)' }}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 text-xs transition-colors ${
                isActive
                  ? 'text-duo-green font-bold'
                  : 'text-gray-400 dark:text-gray-500'
              }`
            }
          >
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
