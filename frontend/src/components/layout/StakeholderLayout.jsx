import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'

/**
 * Shell tunggal untuk seluruh halaman stakeholder: Sidebar + Navbar + area konten.
 * Membungkus komponen existing agar struktur halaman konsisten dan tidak diulang di tiap file.
 */
export default function StakeholderLayout({ title, notifCount, narrow = false, children }) {
    return (
        <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
            <Sidebar notifCount={notifCount} />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Navbar variant="stakeholder" title={title} notifCount={notifCount} />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className={`mx-auto w-full space-y-5 ${narrow ? 'max-w-2xl' : 'max-w-[1400px]'}`}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}