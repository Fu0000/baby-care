import { Outlet, NavLink } from 'react-router-dom'
import { IconHouse } from 'nucleo-glass'
import { IconTimelineVertical } from 'nucleo-glass'
import { IconGear } from 'nucleo-glass'

const navItems = [
  { to: '/', label: '首页', Icon: IconHouse },
  { to: '/history', label: '记录', Icon: IconTimelineVertical },
  { to: '/settings', label: '设置', Icon: IconGear },
]

export default function Layout() {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#1a1a2e]">
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(3.25rem + var(--safe-area-bottom))' }}>
        <Outlet />
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] border-t border-gray-200 dark:border-gray-700/60 z-50"
        style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      >
        <div className="flex justify-around items-center py-2 max-w-lg mx-auto w-full">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-1 text-xs transition-colors ${
                  isActive
                    ? 'text-duo-green font-bold'
                    : 'text-gray-400 dark:text-gray-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} style={{ opacity: isActive ? 1 : 0.7 }} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
