import { useEffect, useState } from 'react'

// A tiny router: the URL path decides which page App renders. pushState changes the URL
// without a reload, and the popstate event tells usePath() to re-render (also on back/forward).

export function navigate(path: string) {
  if (path === window.location.pathname) return
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onChange = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])

  return path
}

export function stockPath(symbol: string) {
  // Index symbols start with "^", which must be escaped in a URL.
  return `/stock/${encodeURIComponent(symbol)}`
}
