import type { ReactNode } from 'react'

interface StickyHeaderProps {
  children: ReactNode
}

/** Sticky page header with progressive backdrop blur that fades out at the bottom. */
export default function StickyHeader({ children }: StickyHeaderProps) {
  return (
    <div className="sticky top-0 z-10 px-4" style={{ paddingTop: 'calc(var(--safe-area-top) + 1rem)' }}>
      {/* Progressive blur: 4 stacked layers, strongest at top, fading to nothing */}
      <div className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,transparent_50%,black_75%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_50%,black_75%,transparent)] pointer-events-none" />
      <div className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent_25%,black_37%,transparent_50%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_25%,black_37%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,transparent_12%,black_20%,transparent_30%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_12%,black_20%,transparent_30%)] pointer-events-none" />
      <div className="absolute inset-0 backdrop-blur-[8px] [mask-image:linear-gradient(to_bottom,black,black_50%,transparent_70%)] [-webkit-mask-image:linear-gradient(to_bottom,black,black_50%,transparent_70%)] pointer-events-none" />
      <div className="relative pb-4">
        {children}
      </div>
    </div>
  )
}
