import api from './api.js'
import dayjs from 'dayjs'

const USE_MOCK = true

// =============================================
// MOCK DATA
// =============================================
const MOCK_COMPLAINTS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  ticket_id: `ADS-2024-${String(i + 1).padStart(4, '0')}`,
  type: ['complaint', 'feedback', 'suggestion'][i % 3],
  category: ['facility', 'academic', 'admin', 'finance'][i % 4],
  description: `Deskripsi aduan nomor ${i + 1}. Ini adalah contoh teks aduan yang cukup panjang untuk demo tampilan pada tabel dan detail halaman.`,
  unit: ['Bagian Akademik', 'Sarana Prasarana', 'Kemahasiswaan', 'Keuangan'][i % 4],
  is_anonymous: i % 3 === 0,
  sender_name: i % 3 === 0 ? null : `User ${i + 1}`,
  sender_role: ['Mahasiswa', 'Dosen', 'Tenaga Admin', 'Mitra'][i % 4],
  status: ['new', 'process', 'done', 'escalate'][i % 4],
  urgency_score: Math.round((Math.random() * 10) * 10) / 10,
  nlp_category: ['facility', 'academic', 'admin'][i % 3],
  nlp_confidence: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
  sentiment: ['negative', 'neutral', 'positive'][i % 3],
  sla_deadline: dayjs().add(3 - (i % 5), 'day').toISOString(),
  attachments: i % 4 === 0 ? [{ url: 'https://placehold.co/300x200', name: 'bukti.jpg' }] : [],
  followups: [
    { id: 1, by: 'Dr. Sari', note: 'Aduan diterima dan sedang dikaji', status: 'process', created_at: dayjs().subtract(2, 'day').toISOString() },
  ],
  created_at: dayjs().subtract(i, 'day').toISOString(),
  updated_at: dayjs().subtract(i % 3, 'day').toISOString(),
}))

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// =============================================
// COMPLAINT API
// =============================================

export async function getComplaints({ page = 1, limit = 10, ...filters } = {}) {
  if (USE_MOCK) {
    await delay(600)
    let data = [...MOCK_COMPLAINTS]
    if (filters.status)   data = data.filter(c => c.status === filters.status)
    if (filters.type)     data = data.filter(c => c.type === filters.type)
    if (filters.category) data = data.filter(c => c.category === filters.category)
    if (filters.search)   data = data.filter(c => c.description.toLowerCase().includes(filters.search.toLowerCase()))
    const total = data.length
    const items = data.slice((page - 1) * limit, page * limit)
    return { items, total, page, limit }
  }
  const res = await api.get('/complaints', { params: { page, limit, ...filters } })
  return res.data
}

export async function getComplaint(id) {
  if (USE_MOCK) {
    await delay(400)
    return MOCK_COMPLAINTS.find(c => c.id === Number(id)) || null
  }
  const res = await api.get(`/complaints/${id}`)
  return res.data
}

export async function submitComplaint(formData) {
  if (USE_MOCK) {
    await delay(1200)
    const newId = MOCK_COMPLAINTS.length + 1
    return { success: true, ticket_id: `ADS-2024-${String(newId).padStart(4, '0')}`, id: newId }
  }
  const res = await api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getMyComplaints() {
  if (USE_MOCK) {
    await delay(500)
    return MOCK_COMPLAINTS.slice(0, 6)
  }
  const res = await api.get('/complaints/my')
  return res.data
}

export async function updateComplaintStatus(id, status, note = '') {
  if (USE_MOCK) {
    await delay(400)
    return { success: true }
  }
  const res = await api.patch(`/complaints/${id}/status`, { status, note })
  return res.data
}

export async function replyToComplaint(id, message) {
  if (USE_MOCK) {
    await delay(400)
    return { success: true }
  }
  const res = await api.post(`/complaints/${id}/reply`, { message })
  return res.data
}
