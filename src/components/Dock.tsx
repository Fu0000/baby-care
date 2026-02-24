import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Dialog } from "@base-ui/react/dialog";
import { IconHouse } from "nucleo-glass";
import { IconTimelineVertical } from "nucleo-glass";
import { IconGear } from "nucleo-glass";
import { IconFeather } from "nucleo-glass";
import { getOrderedTools } from "../lib/tools.tsx";

const navItems = [
  { to: "/", label: "首页", Icon: IconHouse },
  { to: "/history", label: "记录", Icon: IconTimelineVertical },
  { to: "/settings", label: "设置", Icon: IconGear },
];

export default function Dock() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const tools = getOrderedTools();

  return (
    <>
      {/* Gradient mask — fades content behind the floating dock */}
      <div className="fixed bottom-0 inset-x-0 h-16 bg-gradient-to-t from-gray-50 dark:from-[#1a1a2e] to-transparent pointer-events-none z-50" />
      {/* Floating dock tab bar + action button */}
      <div className="fixed bottom-4 pwa:bottom-4 inset-x-0 z-50 flex items-center justify-between px-4 gap-2">
        <nav className="floating-dock flex flex-1 items-center gap-2 px-1 py-1 rounded-[30px] bg-white/80 dark:bg-[#16213e]/85 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/50">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1.5 w-auto flex-1 h-13 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white"
                    : "text-gray-400 dark:text-gray-500 active:scale-90"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={26}
                    color="currentColor"
                    style={
                      {
                        "--nc-gradient-1-color-1": "var(--dock-accent-1)",
                        "--nc-gradient-1-color-2": "var(--dock-accent-2)",
                      } as React.CSSProperties
                    }
                  />
                  <span className="text-[10px] font-bold leading-none">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        {/* Quick tools action button */}
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="flex items-center justify-center size-15 rounded-full bg-white/80 dark:bg-[#16213e]/85 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 active:scale-90 transition-all duration-200">
            <IconFeather
              size={26}
              style={
                {
                  "--nc-gradient-1-color-1": "var(--dock-accent-1)",
                  "--nc-gradient-1-color-2": "var(--dock-accent-2)",
                } as React.CSSProperties
              }
            />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-[100] transition-opacity duration-300 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
            <Dialog.Popup className="fixed bottom-0 left-0 right-0 z-[100] bg-white dark:bg-[#16213e] rounded-t-3xl px-5 pt-5 pb-8 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full">
              {/* Drag handle */}
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-5" />
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                工具
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.available) {
                        setOpen(false);
                        navigate(tool.path);
                      }
                    }}
                    className={`rounded-2xl py-5 px-4 min-h-[7.5rem] flex flex-col items-center justify-center text-center transition-all duration-150 ${
                      tool.available
                        ? "bg-white dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/60 active:scale-[0.96]"
                        : "bg-gray-50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-700 opacity-40"
                    }`}
                  >
                    {!tool.available && (
                      <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full mb-1">
                        即将推出
                      </span>
                    )}
                    <div className="mb-2">{tool.icon}</div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      {tool.title}
                    </p>
                  </button>
                ))}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </>
  );
}
