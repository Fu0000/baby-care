import { useRef, useState, useEffect, useCallback, type CSSProperties, type MouseEvent } from 'react'
import { triggerHaptic } from '../lib/haptics.ts'

type Phase = 'idle' | 'pressing' | 'panning'

/** Horizontal distance to activate pan mode (px) */
const HORIZONTAL_THRESHOLD = 8
/** Vertical distance that cancels the gesture (allows scroll) */
const VERTICAL_THRESHOLD = 15
/** Distance outside dock bounds to cancel gesture */
const EXIT_THRESHOLD = 40

const SPRING_TRANSITION = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease'

function getScaleForIndex(index: number, focused: number): number {
  if (index === focused) return 1.15
  const distance = Math.abs(index - focused)
  if (distance === 1) return 0.92
  return 0.88
}

function getOpacityForIndex(index: number, focused: number): number {
  if (index === focused) return 1
  const distance = Math.abs(index - focused)
  if (distance === 1) return 0.6
  return 0.5
}

function getItemIndexAtPoint(clientX: number, rects: DOMRect[]): number | null {
  // Direct hit
  for (let i = 0; i < rects.length; i++) {
    if (clientX >= rects[i].left && clientX <= rects[i].right) {
      return i
    }
  }
  // Nearest by center distance
  let nearest = 0
  let minDist = Infinity
  for (let i = 0; i < rects.length; i++) {
    const center = rects[i].left + rects[i].width / 2
    const dist = Math.abs(clientX - center)
    if (dist < minDist) {
      minDist = dist
      nearest = i
    }
  }
  return nearest
}

interface DockGestureItem {
  to: string
}

interface DockGestureItemProps {
  'data-dock-item': true
  'data-dock-index': number
  style: CSSProperties | undefined
  onClick: (e: MouseEvent) => void
}

interface DockGestureResult {
  navRef: React.RefObject<HTMLElement | null>
  gestureActive: boolean
  focusedIndex: number | null
  getItemProps: (index: number) => DockGestureItemProps
}

export function useDockGesture(
  items: DockGestureItem[],
  navigate: (to: string) => void,
): DockGestureResult {
  const navRef = useRef<HTMLElement | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const startPointRef = useRef({ x: 0, y: 0 })
  const startIndexRef = useRef(0)
  const navRectsRef = useRef<DOMRect[]>([])
  const navBoundsRef = useRef<DOMRect | null>(null)
  const preventClickRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)

  const [gestureActive, setGestureActive] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  // Stable ref for focusedIndex to avoid stale closures
  const focusedIndexRef = useRef<number | null>(null)
  useEffect(() => {
    focusedIndexRef.current = focusedIndex
  }, [focusedIndex])

  const reset = useCallback(() => {
    const nav = navRef.current
    const pid = pointerIdRef.current
    if (nav && pid !== null && nav.hasPointerCapture(pid)) {
      nav.releasePointerCapture(pid)
    }
    phaseRef.current = 'idle'
    pointerIdRef.current = null
    setGestureActive(false)
    setFocusedIndex(null)
  }, [])

  const cacheRects = useCallback(() => {
    const nav = navRef.current
    if (!nav) return
    const els = nav.querySelectorAll<HTMLElement>('[data-dock-item]')
    navRectsRef.current = Array.from(els).map(el => el.getBoundingClientRect())
    navBoundsRef.current = nav.getBoundingClientRect()
  }, [])

  const enterPanning = useCallback((index: number) => {
    phaseRef.current = 'panning'
    setGestureActive(true)
    setFocusedIndex(index)
    focusedIndexRef.current = index
    triggerHaptic('medium')
  }, [])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    function onPointerDown(e: PointerEvent) {
      if (!e.isPrimary) return
      if (phaseRef.current !== 'idle') return

      // Check if the target is a nav item
      const target = e.target as HTMLElement
      const itemEl = target.closest<HTMLElement>('[data-dock-item]')
      if (!itemEl) return

      const index = Number(itemEl.dataset.dockIndex)
      if (Number.isNaN(index)) return

      pointerIdRef.current = e.pointerId
      startPointRef.current = { x: e.clientX, y: e.clientY }
      startIndexRef.current = index
      phaseRef.current = 'pressing'

      // Cache rects for hit testing
      cacheRects()

      // Set pointer capture so we get move/up even outside the element
      nav!.setPointerCapture(e.pointerId)
    }

    function onPointerMove(e: PointerEvent) {
      if (!e.isPrimary || e.pointerId !== pointerIdRef.current) return

      if (phaseRef.current === 'pressing') {
        const dx = e.clientX - startPointRef.current.x
        const dy = e.clientY - startPointRef.current.y

        // If vertical movement exceeds threshold first, cancel (allow scroll)
        if (Math.abs(dy) > VERTICAL_THRESHOLD) {
          reset()
          if (nav!.hasPointerCapture(e.pointerId)) {
            nav!.releasePointerCapture(e.pointerId)
          }
          return
        }

        // If horizontal movement exceeds threshold, enter panning immediately
        if (Math.abs(dx) > HORIZONTAL_THRESHOLD) {
          const idx = getItemIndexAtPoint(e.clientX, navRectsRef.current)
          enterPanning(idx ?? startIndexRef.current)
        }
        return
      }

      if (phaseRef.current === 'panning') {
        const bounds = navBoundsRef.current
        if (bounds) {
          // Cancel if pointer strays too far from dock
          const outsideX = e.clientX < bounds.left - EXIT_THRESHOLD || e.clientX > bounds.right + EXIT_THRESHOLD
          const outsideY = e.clientY < bounds.top - EXIT_THRESHOLD || e.clientY > bounds.bottom + EXIT_THRESHOLD
          if (outsideX || outsideY) {
            preventClickRef.current = true
            reset()
            return
          }
        }

        // Hit test which item the pointer is over
        const idx = getItemIndexAtPoint(e.clientX, navRectsRef.current)
        if (idx !== null && idx !== focusedIndexRef.current) {
          setFocusedIndex(idx)
          focusedIndexRef.current = idx
          triggerHaptic('light')
        }
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (!e.isPrimary || e.pointerId !== pointerIdRef.current) return

      if (phaseRef.current === 'panning') {
        // Navigate to focused item
        const idx = focusedIndexRef.current
        if (idx !== null && idx >= 0 && idx < items.length) {
          preventClickRef.current = true
          navigate(items[idx].to)
        }
        reset()
        return
      }

      // If still pressing (no horizontal swipe detected), just reset
      // and let the NavLink click fire naturally
      reset()
    }

    function onPointerCancel(e: PointerEvent) {
      if (e.pointerId === pointerIdRef.current) {
        if (phaseRef.current === 'panning') {
          preventClickRef.current = true
        }
        reset()
      }
    }

    function onContextMenu(e: Event) {
      if (phaseRef.current !== 'idle') {
        e.preventDefault()
      }
    }

    nav.addEventListener('pointerdown', onPointerDown)
    nav.addEventListener('pointermove', onPointerMove)
    nav.addEventListener('pointerup', onPointerUp)
    nav.addEventListener('pointercancel', onPointerCancel)
    nav.addEventListener('contextmenu', onContextMenu)

    return () => {
      nav.removeEventListener('pointerdown', onPointerDown)
      nav.removeEventListener('pointermove', onPointerMove)
      nav.removeEventListener('pointerup', onPointerUp)
      nav.removeEventListener('pointercancel', onPointerCancel)
      nav.removeEventListener('contextmenu', onContextMenu)
    }
  }, [items, navigate, cacheRects, reset, enterPanning])

  const getItemProps = useCallback(
    (index: number): DockGestureItemProps => ({
      'data-dock-item': true as const,
      'data-dock-index': index,
      style: gestureActive && focusedIndex !== null
        ? {
            transform: `scale(${getScaleForIndex(index, focusedIndex)})`,
            opacity: getOpacityForIndex(index, focusedIndex),
            transition: SPRING_TRANSITION,
            touchAction: 'none',
          }
        : undefined,
      onClick: (e: MouseEvent) => {
        if (preventClickRef.current) {
          e.preventDefault()
          preventClickRef.current = false
        }
      },
    }),
    [gestureActive, focusedIndex],
  )

  return { navRef, gestureActive, focusedIndex, getItemProps }
}
