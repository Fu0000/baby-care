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
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(4.5rem + var(--safe-area-bottom))' }}>
        <Outlet />
      </main>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center" style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 8px)' }}>
        <nav className="floating-dock flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/80 dark:bg-[#16213e]/85 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/50">
          {navItems.map(({ to, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-duo-green/12 text-duo-green dark:bg-duo-green/20'
                    : 'text-gray-400 dark:text-gray-500 active:scale-90'
                }`
              }
            >
              {({ isActive }) => (
                <Icon size={22} style={{ opacity: isActive ? 1 : 0.5 }} />
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
