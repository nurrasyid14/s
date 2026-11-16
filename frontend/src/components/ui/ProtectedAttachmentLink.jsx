import React, { useState } from 'react'
import { FileText, Image, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import useBilingual from '../../hooks/useBilingual.js'
import { downloadOrOpenAttachment } from '../../services/attachmentApi.js'

export default function ProtectedAttachmentLink({
  url,
  name = 'Lampiran',
  size,
  className = '',
}) {
  const { tx } = useBilingual()
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(false)

  const isImg = Boolean(
    name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
    url?.match(/\.(jpg|jpeg|png|webp|gif)$/i)
  )
  const isPdf = Boolean(
    name?.match(/\.pdf$/i) ||
    url?.match(/\.pdf$/i)
  )

  const formattedSize = size
    ? `${(size / 1024).toFixed(0)} KB`
    : null

  async function handleOpen(e) {
    e.preventDefault()
    if (downloading) return
    setDownloading(true)
    setError(false)
    try {
      await downloadOrOpenAttachment(url, name, { isInline: isImg || isPdf })
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownload(e) {
    e.preventDefault()
    e.stopPropagation()
    if (downloading) return
    setDownloading(true)
    setError(false)
    try {
      await downloadOrOpenAttachment(url, name, { isInline: false })
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-2 border border-[var(--color-border)] p-2 rounded-xl bg-[var(--color-bg-secondary)] text-xs transition hover:border-[var(--color-primary)] ${className}`}
    >
      <div className="text-[var(--color-primary)] shrink-0">
        {isImg ? <Image size={16} /> : <FileText size={16} />}
      </div>
      <div className="flex flex-col min-w-0 pr-1">
        <span className="font-medium text-[var(--color-text)] truncate max-w-[160px] sm:max-w-[200px]" title={name}>
          {name}
        </span>
        {formattedSize && (
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
            {formattedSize}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {error ? (
          <span className="text-red-500 text-[10px] flex items-center gap-0.5" title={tx('Gagal mengunduh file', 'Failed to download file')}>
            <AlertCircle size={12} /> {tx('Gagal', 'Failed')}
          </span>
        ) : downloading ? (
          <span className="text-[var(--color-text-muted)] p-1">
            <Loader2 size={14} className="animate-spin" />
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={handleOpen}
              title={isImg || isPdf ? tx('Buka di tab baru', 'Open in new tab') : tx('Unduh', 'Download')}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] rounded transition"
              aria-label={`${tx('Buka', 'Open')} ${name}`}
            >
              {isImg || isPdf ? <ExternalLink size={14} /> : <Download size={14} />}
            </button>
            {(isImg || isPdf) && (
              <button
                type="button"
                onClick={handleDownload}
                title={tx('Unduh langsung', 'Download directly')}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] rounded transition"
                aria-label={`${tx('Unduh', 'Download')} ${name}`}
              >
                <Download size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
