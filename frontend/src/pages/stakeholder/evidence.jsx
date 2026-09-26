import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints } from '../../services/complaintApi.js'
import { formatDate } from '../../utils/formatter.js'
import { Paperclip, ImageOff } from 'lucide-react'

export default function Evidence() {
    const { t } = useTranslation()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getComplaints({ limit: 50 })
            .then(res => setData(res.items.filter(c => c.attachments?.length > 0)))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar variant="stakeholder" title={t('nav.evidence')} />
                <main className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-56 rounded-xl" />)}
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-24">
                            <ImageOff size={32} className="text-[var(--color-text-muted)] mx-auto mb-3" />
                            <div className="font-semibold text-[var(--color-text)]">{t('common.empty_state')}</div>
                            <div className="text-sm text-[var(--color-text-muted)] mt-1">{t('common.empty_desc')}</div>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.map(c => (
                                <Link key={c.id} to={`/stakeholder/complaints/${c.id}`} className="card-elevated rounded-xl overflow-hidden hover:border-[var(--color-primary)]/40 transition-smooth">
                                    <div className="aspect-[4/3] bg-[var(--color-bg-secondary)] overflow-hidden">
                                        <img src={c.attachments[0].url} alt={c.attachments[0].name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-mono text-[var(--color-text-muted)]">{c.ticket_id}</span>
                                            <StatusBadge status={c.status} />
                                        </div>
                                        <p className="text-sm text-[var(--color-text)] line-clamp-2">{c.description}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--color-text-muted)]">
                                            <Paperclip size={11} />
                                            {c.attachments.length} lampiran · {formatDate(c.created_at)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}