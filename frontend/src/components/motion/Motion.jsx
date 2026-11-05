import { useEffect, useRef, useState, createElement } from 'react'

/** true bila pengguna meminta gerak minimal di pengaturan OS. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return undefined
    const onChange = e => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Mengembalikan [ref, inView]. Sekali terlihat, tetap true (animasi masuk tidak diulang). */
export function useInView({ threshold = 0.18, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || inView) return undefined
    if (!('IntersectionObserver' in window)) { setInView(true); return undefined }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect() }
    }, { threshold, rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin, inView])
  return [ref, inView]
}

/**
 * Bungkus elemen agar muncul saat masuk viewport.
 * variant: up | left | right | scale | blur | clip
 */
export function Reveal({ as = 'div', variant = 'up', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView()
  return createElement(
    as,
    {
      ref,
      'data-reveal': variant,
      className: `${className} ${inView ? 'is-in' : ''}`,
      style: { '--d': `${delay}ms`, ...style },
      ...rest,
    },
    children,
  )
}

/** Angka yang menghitung naik saat terlihat. Mendukung desimal dan sufiks. */
export function CountUp({ value, duration = 1100, decimals, prefix = '', suffix = '', className = '', locale = 'id-ID' }) {
  const num = Number(value)
  const valid = Number.isFinite(num)
  const dec = decimals ?? (valid && !Number.isInteger(num) ? 1 : 0)
  const [ref, inView] = useInView({ threshold: 0.3 })
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!valid || !inView) return undefined
    if (reduced) { setShown(num); return undefined }
    let raf
    const start = performance.now()
    const tick = now => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4) // ease-out quart
      setShown(num * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [num, valid, inView, reduced, duration])

  if (!valid) return <span className={className}>{value}</span>
  const text = shown.toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec })
  return <span ref={ref} className={`tabular ${className}`}>{prefix}{text}{suffix}</span>
}

/** Pecah teks menjadi kata yang muncul bergiliran. `offset` menggeser urutan antar baris. */
export function Words({ text, offset = 0, wordClassName = '' }) {
  return text.split(' ').map((w, i) => (
    <span key={`${w}-${i}`} className={`word ${wordClassName}`} style={{ '--w': i + offset }}>
      {w}{' '}
    </span>
  ))
}

/**
 * Reveal otomatis untuk setiap anak langsung dari container (section dashboard).
 * Memakai atribut data-* (bukan className) agar tidak terhapus saat React me-render ulang.
 * Section yang sudah terlihat saat halaman dibuka muncul bergiliran 70ms.
 */
export function useAutoReveal(deps = []) {
  const ref = useRef(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const show = el => el.setAttribute('data-in', '')
    if (!('IntersectionObserver' in window)) {
      Array.from(root.children).forEach(el => el instanceof HTMLElement && show(el))
      return undefined
    }
    let initial = 0
    const timers = []
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target) }
      })
    }, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' })
    const register = el => {
      // Jangan lewati elemen yang sudah bertanda data-reveal: effect bisa berjalan ulang (StrictMode).
      if (!(el instanceof HTMLElement) || el.hasAttribute('data-in')) return
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'up')
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight) el.style.setProperty('--d', `${Math.min(initial++, 6) * 70}ms`)
      io.observe(el)
      // Jaring pengaman: apa pun yang terjadi, konten tidak boleh tersembunyi permanen.
      timers.push(setTimeout(() => show(el), 1500))
    }
    Array.from(root.children).forEach(register)
    const mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(register)))
    mo.observe(root, { childList: true })
    return () => { io.disconnect(); mo.disconnect(); timers.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/** Pasang ke kartu ber-class `spotlight`: menyimpan posisi kursor ke --mx/--my. */
export function useSpotlight() {
  return {
    onPointerMove: e => {
      const r = e.currentTarget.getBoundingClientRect()
      e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
      e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
    },
  }
}
