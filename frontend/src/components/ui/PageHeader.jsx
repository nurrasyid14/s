/**
 * Header konteks di bawah Navbar: judul bagian, deskripsi singkat, dan area aksi
 * (filter periode, tombol CTA). Judul halaman utama tetap ditampilkan oleh Navbar.
 */
export default function PageHeader({ heading, description, actions }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h2 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">{heading}</h2>
                {description && (
                    <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{description}</p>
                )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}