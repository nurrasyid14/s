// Tema chart bersama. Semua warna memakai CSS variable agar otomatis mengikuti light/dark mode.

export const TOOLTIP_STYLE = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    boxShadow: '0 12px 30px -12px rgba(10,36,99,0.35)',
    fontSize: '12px',
    color: 'var(--color-text)',
}

export const AXIS_TICK = { fontSize: 11, fill: 'var(--color-text-muted)' }

// Urutan warna seri: biru aksi, emas aksen, navy, lalu netral (rasio biru 60 / emas 10).
export const SERIES_COLORS = [
    'var(--color-primary)',
    'var(--color-gold)',
    'var(--color-navy)',
    'var(--color-text-muted)',
]

// Animasi recharts: tumbuh dengan kurva ease-out, tidak terlalu lama untuk dashboard.
export const CHART_ANIM = { isAnimationActive: true, animationDuration: 900, animationEasing: 'ease-out' }
