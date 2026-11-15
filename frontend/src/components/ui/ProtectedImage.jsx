import React from 'react'
import { useAttachmentBlob } from '../../services/attachmentApi.js'
import { ImageOff, Loader2 } from 'lucide-react'

export default function ProtectedImage({
  src,
  alt = 'Lampiran',
  className = '',
  loadingClassName = 'h-full w-full flex items-center justify-center bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] min-h-[60px]',
  errorClassName = 'h-full w-full flex flex-col items-center justify-center bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] p-2 text-center text-xs min-h-[60px]',
  ...props
}) {
  const { blobUrl, loading, error } = useAttachmentBlob(src)

  if (loading) {
    return (
      <div className={loadingClassName} role="status" aria-label="Memuat gambar...">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (error || !blobUrl) {
    return (
      <div className={errorClassName}>
        <ImageOff className="w-5 h-5 mb-1 opacity-70" />
        <span className="text-[10px] leading-tight">Gagal memuat</span>
      </div>
    )
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      {...props}
    />
  )
}
