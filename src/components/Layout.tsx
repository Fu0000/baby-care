import { Outlet, NavLink } from "react-router-dom";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { IconHouse } from "nucleo-glass";
import { IconTimelineVertical } from "nucleo-glass";
import { IconGear } from "nucleo-glass";

const navItems = [
  { to: "/", label: "首页", Icon: IconHouse },
  { to: "/history", label: "记录", Icon: IconTimelineVertical },
  { to: "/settings", label: "设置", Icon: IconGear },
];

export default function Layout() {
  return (
    <div className="bg-gray-50 dark:bg-[#1a1a2e] h-dvh relative [--footer-height:5rem] pwa:[--footer-height:6rem]">
      <ScrollArea.Root className="h-full">
        <ScrollArea.Viewport className="h-full">
          <main className="min-h-[calc(100dvh-var(--footer-height))] pb-[var(--footer-height)]">
            <Outlet />
          </main>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="m-1 flex w-1.5 justify-center rounded-full opacity-0 transition-opacity duration-200 data-[hovering]:opacity-100 data-[hovering]:pointer-events-auto data-[scrolling]:opacity-100 data-[scrolling]:duration-0 data-[scrolling]:pointer-events-auto">
          <ScrollArea.Thumb className="w-full rounded-full bg-gray-300 dark:bg-gray-600" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      {/* Gradient mask — fades content behind the floating dock */}
      <div className="fixed bottom-0 inset-x-0 h-16 bg-gradient-to-t from-gray-50 dark:from-[#1a1a2e] to-transparent pointer-events-none z-50" />
      {/* Floating dock tab bar */}
      <div className="fixed bottom-4 pwa:bottom-[var(--safe-area-bottom)] inset-x-0 z-50 flex justify-center">
        <nav className="floating-dock flex items-center gap-2 px-1.5 py-1.5 rounded-[30px] bg-white/80 dark:bg-[#16213e]/85 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/50">
          {navItems.map(({ to, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-duo-green/12 text-duo-green dark:bg-duo-green/20"
                    : "text-gray-400 dark:text-gray-500 active:scale-90"
                }`
              }
            >
              {({ isActive }) => (
                <Icon size={30} style={{ opacity: isActive ? 1 : 0.5 }} />
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
