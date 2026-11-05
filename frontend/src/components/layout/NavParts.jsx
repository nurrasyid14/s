import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Navigasi pil horizontal dengan indikator yang bergeser ke item aktif.
 * items: [{ to, label }], activeIndex: number (-1 bila tidak ada)
 */
export function PillNav({ items, activeIndex, label = 'Navigasi' }) {
  const refs = useRef([])
  const [box, setBox] = useState(null)

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[activeIndex]
      setBox(el ? { left: el.offsetLeft, width: el.offsetWidth } : null)
    }
    measure()
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeIndex, items.length])

  return (
    <nav aria-label={label} className="relative hidden items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1.5 lg:flex">
      {box && (
        <span
          className="absolute top-1.5 bottom-1.5 left-0 rounded-full bg-[var(--color-navy)] shadow-[0_6px_16px_-6px_rgba(10,36,99,0.6)] transition-[transform,width] duration-300 ease-[var(--ease-out)] dark:bg-[var(--color-primary)]"
          style={{ transform: `translateX(${box.left}px)`, width: box.width }}
          aria-hidden="true"
        />
      )}
      {items.map(({ to, label: text }, i) => (
        <Link
          key={to}
          to={to}
          ref={el => { refs.current[i] = el }}
          aria-current={i === activeIndex ? 'page' : undefined}
          className={`relative z-10 rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
            i === activeIndex ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {text}
        </Link>
      ))}
    </nav>
  )
}

/**
 * Rail ikon vertikal di sidebar navy: blok emas bergeser ke item aktif, tooltip label saat hover.
 * items: [{ key, to, icon, label, badge }]
 */
export function RailNav({ items, activeIndex, label = 'Navigasi' }) {
  const STEP = 60 // tinggi item 48px + jarak 12px
  return (
    <nav aria-label={label} className="relative flex w-full flex-col items-center gap-3 px-3">
      {activeIndex >= 0 && (
        <span
          className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2 rounded-2xl bg-[var(--color-sidebar-active-bg)] shadow-[0_8px_20px_-8px_rgba(245,183,0,0.8)] transition-transform duration-300 ease-[var(--ease-out)]"
          style={{ transform: `translateY(${activeIndex * STEP}px)` }}
          aria-hidden="true"
        />
      )}
      {items.map(({ key, to, icon: Icon, label: text, badge }, i) => {
        const active = i === activeIndex
        return (
          <Link
            key={key || to}
            to={to}
            aria-label={text}
            aria-current={active ? 'page' : undefined}
            className={`press group relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200 ${
              active
                ? 'text-[var(--color-sidebar-active-text)]'
                : 'text-[var(--color-sidebar-text-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-text)]'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
            {badge && (
              <span className="live-dot absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[var(--color-sidebar-bg)]" />
            )}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3 origin-left scale-95 whitespace-nowrap rounded-lg bg-[var(--color-navy-deep)] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
            >
              {text}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

/** Tombol ikon di sidebar navy (tema, bahasa, bantuan, keluar). */
export function RailButton({ children, danger, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`press flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 ${
        danger
          ? 'text-rose-300 hover:bg-rose-500/15 hover:text-rose-200'
          : 'text-[var(--color-sidebar-text-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-text)]'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/** Logo bulat emas SuaraLens. */
export function BrandMark({ size = 36 }) {
  return (
    <span
      className="flex items-center justify-center rounded-xl bg-[var(--color-gold)] text-[var(--color-on-gold)] shadow-[0_6px_16px_-6px_rgba(245,183,0,0.7)]"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3" /><path d="m16 16-1.9-1.9" />
      </svg>
    </span>
  )
}
