import type { MouseEvent, ReactNode } from 'react'
import { navigate } from './router'

/** A real <a href>, so open-in-new-tab and middle-click still work; plain clicks stay in the app. */
export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} onClick={onClick} className={className}>
      {children}
    </a>
  )
}
