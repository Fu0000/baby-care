import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Dialog } from "@base-ui/react/dialog";
import { IconHouse } from "nucleo-glass";
import { IconTimelineVertical } from "nucleo-glass";
import { IconGear } from "nucleo-glass";
import { IconFeather } from "nucleo-glass";
import { getOrderedTools } from "../lib/tools.tsx";
import { useDockGesture } from "../hooks/useDockGesture.ts";

const navItems = [
  { to: "/", label: "首页", Icon: IconHouse },
  { to: "/history", label: "记录", Icon: IconTimelineVertical },
  { to: "/settings", label: "设置", Icon: IconGear },
];

const iconGradientStyle = {
  "--nc-gradient-1-color-1": "var(--dock-accent-1)",
  "--nc-gradient-1-color-2": "var(--dock-accent-2)",
} as React.CSSProperties;

export default function Dock() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const tools = getOrderedTools();
  const { navRef, getItemProps } = useDockGesture(navItems, navigate);

  return (
    <>
      {/* Gradient mask — fades content behind the floating dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-16 bg-gradient-to-t from-gray-50 to-transparent dark:from-[#1a1a2e]" />

      {/* Floating dock tab bar + action button */}
      <div className="pwa:bottom-5.5 pwa:px-5.5 fixed inset-x-0 bottom-4 z-50 flex items-center justify-between gap-2 px-4">
        <nav
          ref={navRef as React.RefObject<HTMLElement>}
          className="floating-dock flex flex-1 items-center gap-2 rounded-[30px] border border-gray-200/70 bg-white/80 px-1 py-1 backdrop-blur-xl dark:border-gray-700/50 dark:bg-[#16213e]/85"
        >
          {navItems.map(({ to, label, Icon }, index) => {
            const itemProps = getItemProps(index);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                data-dock-item={itemProps["data-dock-item"]}
                data-dock-index={itemProps["data-dock-index"]}
                onClick={itemProps.onClick}
                style={itemProps.style}
                className={({ isActive }) =>
                  `flex h-13.5 w-auto flex-1 flex-col items-center justify-center gap-1 rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white"
                      : "text-gray-400 active:scale-90 dark:text-gray-500"
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
                    <span className="text-[10px] leading-none font-bold">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        {/* Quick tools action button */}
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="flex size-16 items-center justify-center rounded-full border border-gray-200/70 bg-white/80 text-gray-400 backdrop-blur-xl transition-all duration-200 active:scale-90 dark:border-gray-700/50 dark:bg-[#16213e]/85 dark:text-gray-500">
            <IconFeather size={28} style={iconGradientStyle} />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/40 transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed right-0 bottom-0 left-0 z-[100] rounded-t-3xl bg-white px-5 pt-5 pb-8 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full dark:bg-[#16213e]">
              {/* Drag handle */}
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
              <p className="mb-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">
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
                    className={`flex min-h-[7.5rem] flex-col items-center justify-center rounded-2xl px-4 py-5 text-center transition-all duration-150 ${
                      tool.available
                        ? "border border-gray-200 bg-white active:scale-[0.96] dark:border-gray-700/60 dark:bg-[#16213e]"
                        : "border border-dashed border-gray-200 bg-gray-50 opacity-40 dark:border-gray-700 dark:bg-gray-800/30"
                    }`}
                  >
                    {!tool.available && (
                      <span className="mb-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-400 dark:bg-gray-700 dark:text-gray-500">
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
