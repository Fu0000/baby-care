import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { afterEach, vi } from 'vitest'

function createStorage() {
  let data = new Map<string, string>()
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    setItem(key: string, value: string) {
      data.set(key, String(value))
    },
    removeItem(key: string) {
      data.delete(key)
    },
    clear() {
      data = new Map<string, string>()
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null
    },
    get length() {
      return data.size
    },
  } satisfies Storage
}

Object.defineProperty(globalThis, 'indexedDB', {
  writable: true,
  value: indexedDB,
})

Object.defineProperty(globalThis, 'IDBKeyRange', {
  writable: true,
  value: IDBKeyRange,
})

const localStorageMock = createStorage()
const sessionStorageMock = createStorage()

Object.defineProperty(globalThis, 'localStorage', {
  writable: true,
  value: localStorageMock,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  writable: true,
  value: sessionStorageMock,
})

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: sessionStorageMock,
})

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

if (!window.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserver,
  })
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
}

if (!navigator.vibrate) {
  Object.defineProperty(navigator, 'vibrate', {
    writable: true,
    value: vi.fn(),
  })
}

afterEach(async () => {
  vi.useRealTimers()
  cleanup()
  const { db } = await import('../lib/db.ts')
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorageMock.clear()
  sessionStorageMock.clear()
  document.documentElement.className = ''
})
