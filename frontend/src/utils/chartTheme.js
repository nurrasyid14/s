// Tema chart bersama. Semua warna memakai CSS variable agar otomatis mengikuti light/dark mode.

export const TOOLTIP_STYLE = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--color-text)',
}

export const AXIS_TICK = { fontSize: 11, fill: 'var(--color-text-muted)' }

// Urutan warna seri kategorikal: hijau brand, aksen kuning, hijau tua, lalu netral.
export const SERIES_COLORS = [
    'var(--color-primary)',
    'var(--color-accent)',
    'var(--color-primary-dark)',
    'var(--color-text-muted)',
]