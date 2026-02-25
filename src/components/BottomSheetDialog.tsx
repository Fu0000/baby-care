import { Dialog } from '@base-ui/react/dialog'
import type { CSSProperties, ReactNode } from 'react'

interface BottomSheetDialogProps {
  title?: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  showHandle?: boolean
  zIndexClassName?: string
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export default function BottomSheetDialog({
  title,
  children,
  className,
  style,
  showHandle = true,
  zIndexClassName,
}: BottomSheetDialogProps) {
  return (
    <Dialog.Popup
      className={joinClassNames(
        'fixed bottom-0 left-0 right-0 rounded-t-3xl bg-white px-4 pt-5 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full outline-none dark:bg-[#16213e]',
        zIndexClassName,
        className,
      )}
      style={{
        paddingBottom: 'calc(var(--safe-area-bottom) + 2rem)',
        ...style,
      }}
    >
      {showHandle && (
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
      )}
      {title && (
        <Dialog.Title className="mb-2 text-center text-lg font-extrabold text-gray-800 dark:text-white">
          {title}
        </Dialog.Title>
      )}
      {children}
    </Dialog.Popup>
  )
}
