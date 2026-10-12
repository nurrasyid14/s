import { useState, useEffect } from 'react'

/**
 * useDebounce hook according to frontend-patterns
 * Delays updating the debounced value until after delay ms has passed
 * since the last time the input value changed.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
