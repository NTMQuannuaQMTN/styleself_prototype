import { useEffect, useRef, useState } from 'react'

/**
 * Adds a one-time "reveal on scroll" effect. Returns a ref to attach to the
 * element and a boolean once it has entered the viewport.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15, ...options },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, options])

  return { ref, visible }
}
