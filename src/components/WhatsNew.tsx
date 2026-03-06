'use client'

import { useEffect, useRef, useState } from 'react'
import { changelog } from '@/lib/changelog'

const STORAGE_KEY = 'whats-new-last-seen'

function getLastSeenVersion(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

function setLastSeenVersion(version: string) {
  localStorage.setItem(STORAGE_KEY, version)
}

export default function WhatsNew() {
  const [open, setOpen] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const latestVersion = changelog[0]?.version ?? null

  useEffect(() => {
    const lastSeen = getLastSeenVersion()
    if (latestVersion && lastSeen !== latestVersion) {
      setHasNew(true)
    }
  }, [latestVersion])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen() {
    setOpen((prev) => !prev)
    if (!open && latestVersion) {
      setLastSeenVersion(latestVersion)
      setHasNew(false)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="relative p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-label="What's new"
        title="What's new"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        {hasNew && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20" />
          <div
            ref={panelRef}
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl border-l border-gray-200 overflow-y-auto animate-slide-in"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">What&apos;s New</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-6">
              {changelog.map((entry) => (
                <div key={entry.version}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      v{entry.version}
                    </span>
                    <span className="text-xs text-gray-400">{entry.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.changes.map((change, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-600 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-gray-300 before:rounded-full"
                      >
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
