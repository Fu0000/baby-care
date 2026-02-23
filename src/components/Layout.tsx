import { Outlet, NavLink } from 'react-router-dom'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      {!active && <polyline points="9 22 9 12 15 12 15 22" />}
    </svg>
  )
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity="0.15" />
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="7" y1="17" x2="7" y2="13" />
          <line x1="12" y1="17" x2="12" y2="9" />
          <line x1="17" y1="17" x2="17" y2="5" />
        </>
      ) : (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="7" y1="17" x2="7" y2="13" />
          <line x1="12" y1="17" x2="12" y2="9" />
          <line x1="17" y1="17" x2="17" y2="5" />
        </>
      )}
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.9}>
      <circle cx="12" cy="12" r="3" fill={active ? '#fff' : 'none'} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const navItems = [
  { to: '/', label: '首页', Icon: HomeIcon },
  { to: '/history', label: '记录', Icon: ChartIcon },
  { to: '/settings', label: '设置', Icon: SettingsIcon },
]

export default function Layout() {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#1a1a2e]" style={{ paddingTop: 'var(--safe-area-top)' }}>
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(3.5rem + var(--safe-area-bottom))' }}>
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] border-t border-gray-200 dark:border-gray-700/60 z-50 flex flex-col">
        <div className="flex justify-around items-center py-2.5 max-w-lg mx-auto w-full">
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
                  <Icon active={isActive} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        {/* Safe area spacer — just background fill, no visual height */}
        <div style={{ height: 'var(--safe-area-bottom)' }} />
      </nav>
    </div>
  )
}
