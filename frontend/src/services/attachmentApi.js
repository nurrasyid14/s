import { useState, useEffect } from 'react'
import api from './api.js'

/**
 * Normalizes an attachment URL or path to be relative to the Axios API instance.
 * E.g., "http://localhost:8090/api/complaints/1/attachments/file.png" -> "/complaints/1/attachments/file.png"
 * "/api/complaints/1/attachments/file.png" -> "/complaints/1/attachments/file.png"
 */
export function cleanAttachmentPath(url) {
  if (!url || url === '#') return ''
  try {
    let path = url
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url)
      path = parsed.pathname
    }
    if (path.startsWith('/api/')) {
      path = path.slice(4)
    } else if (path.startsWith('api/')) {
      path = '/' + path.slice(4)
    }
    if (!path.startsWith('/')) {
      path = '/' + path
    }
    return path
  } catch {
    return url
  }
}

/**
 * Fetches an attachment with authenticated Authorization Bearer header, returning a Blob.
 */
export async function fetchAttachmentBlob(url) {
  const path = cleanAttachmentPath(url)
  if (!path) throw new Error('Invalid attachment URL')
  const response = await api.get(path, { responseType: 'blob' })
  return response.data
}

/**
 * Custom React Hook to load and retain a local object URL for an authenticated attachment.
 * Automatically handles revokeObjectURL on unmount or URL change to avoid memory leaks.
 */
export function useAttachmentBlob(url) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(Boolean(url && url !== '#'))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!url || url === '#') {
      setBlobUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    // If url is already an inline data URI or object URL
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      setBlobUrl(url)
      setLoading(false)
      setError(null)
      return
    }

    let active = true
    let createdUrl = null
    setLoading(true)
    setError(null)

    fetchAttachmentBlob(url)
      .then((blob) => {
        if (!active) return
        createdUrl = URL.createObjectURL(blob)
        setBlobUrl(createdUrl)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        console.error('Failed to load attachment blob:', err)
        setError(err)
        setLoading(false)
      })

    return () => {
      active = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [url])

  return { blobUrl, loading, error }
}

/**
 * Helper to download or open an attachment in a new tab via authenticated blob request.
 * Pre-opens blank tab synchronously within user gesture if inline to prevent browser popup blockers.
 */
export async function downloadOrOpenAttachment(url, filename = 'lampiran', { isInline = false } = {}) {
  let newTab = null
  if (isInline && typeof window !== 'undefined') {
    try {
      newTab = window.open('about:blank', '_blank')
    } catch {
      newTab = null
    }
  }

  try {
    const blob = await fetchAttachmentBlob(url)
    const objectUrl = URL.createObjectURL(blob)

    if (isInline) {
      if (newTab && !newTab.closed) {
        newTab.location.href = objectUrl
      } else {
        window.open(objectUrl, '_blank')
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
    } else {
      if (newTab && !newTab.closed) {
        newTab.close()
      }
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename || 'lampiran'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000)
    }
  } catch (err) {
    if (newTab && !newTab.closed) {
      newTab.close()
    }
    console.error('Download/Open attachment failed:', err)
    throw err
  }
}
