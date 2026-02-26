import { NavLink, useNavigate } from 'react-router-dom'
import { IconHouse } from 'nucleo-glass'
import { IconTimelineVertical } from 'nucleo-glass'
import { IconGear } from 'nucleo-glass'
import { IconFeather } from 'nucleo-glass'
import { useDockGesture } from '../hooks/useDockGesture.ts'

const navItems = [
  { to: '/', label: '首页', Icon: IconHouse },
  { to: '/history', label: '记录', Icon: IconTimelineVertical },
  { to: '/tools', label: '工具', Icon: IconFeather },
  { to: '/settings', label: '设置', Icon: IconGear },
]

const iconGradientStyle = {
  '--nc-gradient-1-color-1': 'var(--dock-accent-1)',
  '--nc-gradient-1-color-2': 'var(--dock-accent-2)',
} as React.CSSProperties

export default function Dock() {
  const navigate = useNavigate()
  const { navRef, getItemProps } = useDockGesture(navItems, navigate)

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-16 bg-gradient-to-t from-gray-50 to-transparent dark:from-[#1a1a2e]" />

      <div className="pwa:bottom-5.5 pwa:px-5.5 fixed inset-x-0 bottom-4 z-50 flex items-center px-4">
        <nav
          ref={navRef as React.RefObject<HTMLElement>}
          className="floating-dock flex flex-1 items-center gap-2 rounded-[30px] border border-gray-200/70 bg-white/80 px-1 py-1 backdrop-blur-xl dark:border-gray-700/50 dark:bg-[#16213e]/85"
        >
          {navItems.map(({ to, label, Icon }, index) => {
            const itemProps = getItemProps(index)
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                data-dock-item={itemProps['data-dock-item']}
                data-dock-index={itemProps['data-dock-index']}
                onClick={itemProps.onClick}
                style={itemProps.style}
                className={({ isActive }) =>
                  `flex h-13.5 w-auto flex-1 flex-col items-center justify-center gap-1 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white'
                      : 'text-gray-400 active:scale-90 dark:text-gray-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={28}
                      color="currentColor"
                      style={{
                        ...iconGradientStyle,
                        opacity: isActive ? 1 : 0.95,
                      }}
                    />
                    <span className="text-[10px] leading-none font-bold">{label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </>
  )
}
