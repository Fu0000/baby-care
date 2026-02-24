import { Outlet } from "react-router-dom";
import { ScrollArea } from "@base-ui/react/scroll-area";
import Dock from "./Dock.tsx";

export default function Layout() {
  return (
    <div className="bg-gray-50 dark:bg-[#1a1a2e] h-screen relative [--footer-height:5rem] pwa:[--footer-height:6rem]">
      <ScrollArea.Root className="h-full">
        <ScrollArea.Viewport className="h-full">
          <main className="min-h-[calc(100vh-var(--footer-height))] pb-[var(--footer-height)]">
            <Outlet />
          </main>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="m-1 flex w-1.5 justify-center rounded-full opacity-0 transition-opacity duration-200 data-[hovering]:opacity-100 data-[hovering]:pointer-events-auto data-[scrolling]:opacity-100 data-[scrolling]:duration-0 data-[scrolling]:pointer-events-auto">
          <ScrollArea.Thumb className="w-full rounded-full bg-gray-300 dark:bg-gray-600" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <Dock />
    </div>
  );
}
