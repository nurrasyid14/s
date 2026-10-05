import api from './api.js'
import dayjs from 'dayjs'
import { UNITS } from '../data/units.js'

const USE_MOCK = true

// =============================================
// MOCK DATA (Berbasis 14 Unit & 7 Status)
// =============================================
const SAMPLE_ISSUES = [
  { unit: 'Sarana Prasarana dan Layanan Umum', desc: 'Pendingin ruangan (AC) di Ruang Kelas D4 Lt. 2 bocor dan mengeluarkan suara bising saat perkuliahan berlangsung.', cat: 'facility' },
  { unit: 'TIK/Sistem Informasi', desc: 'Jaringan WiFi di Gedung Pascasarjana mengalami RTO berkala sejak kemarin, mengganggu pengerjaan tugas daring.', cat: 'facility' },
  { unit: 'Akademik', desc: 'Nilai mata kuliah Praktikum Jaringan Semester Lalu belum terbit pada portal SIAKAD padahal masa revisi KHS hampir berakhir.', cat: 'academic' },
  { unit: 'Keuangan', desc: 'Status pembayaran UKT di sistem perbankan belum tersinkronisasi ke portal kampus padahal bukti transfer sudah sukses.', cat: 'finance' },
  { unit: 'Kemahasiswaan', desc: 'Pengumuman pencairan beasiswa prestasi semester ini belum ada kejelasan jadwal resmi.', cat: 'admin' },
  { unit: 'Perpustakaan', desc: 'Sistem repositori tugas akhir kampus tidak dapat diunduh untuk file PDF bab metodologi penelitian.', cat: 'academic' },
  { unit: 'Ukarni dan Hubungan Alumni', desc: 'Informasi lowongan magang industri BUMN belum terupdate pada portal karir kampus pekan ini.', cat: 'admin' },
  { unit: 'Laboratorium/Jurusan', desc: 'Kabel osiloskop di Lab Elektronika Meja 4 rusak dan perlu kalibrasi ulang untuk praktikum sensor.', cat: 'facility' },
  { unit: 'Keamanan dan Ketertiban', desc: 'Penerangan di area parkir motor barat dekat gerbang belakang mati, rawan pencurian helm.', cat: 'facility' },
  { unit: 'SDM/Kepegawaian', desc: 'Pelayanan administrasi surat pengantar dosen pembimbing di loket fakultas sering kosong di jam kerja.', cat: 'admin' },
  { unit: 'Kerjasama dan Hubungan Eksternal', desc: 'Konfirmasi berkas MoU program magang mandiri luar negeri belum ditandatangani lebih dari 2 pekan.', cat: 'admin' },
  { unit: 'Informasi Publik/PPID', desc: 'Dokumen laporan keterbukaan informasi tahunan pada web PPID tidak dapat diakses (error 404).', cat: 'admin' },
  { unit: 'Pimpinan/Manajemen', desc: 'Usulan penambahan jam operasional perpustakaan dan gedung belajar bersama hingga malam hari saat minggu UTS.', cat: 'suggestion' },
  { unit: 'Lainnya/Lintas Unit', desc: 'Koordinasi peminjaman proyektor dan aula untuk kegiatan seminar kolaborasi antar himpunan terhambat.', cat: 'admin' },
]

const STATUS_KEYS = [
  'received',     // 1. Diterima
  'verified',     // 2. Diverifikasi
  'dispatched',   // 3. Didisposisikan
  'in_progress',  // 4. Diproses
  'action_taken', // 5. Ditindaklanjuti
  'answered',     // 6. Dijawab
  'resolved',     // 7. Selesai
]

function generateInitialMockData() {
  const localSaved = localStorage.getItem('suaralens_mock_complaints_v2')
  if (localSaved) {
    try { return JSON.parse(localSaved) } catch { /* ignore */ }
  }

  const list = Array.from({ length: 28 }, (_, i) => {
    const issue = SAMPLE_ISSUES[i % SAMPLE_ISSUES.length]
    const status = STATUS_KEYS[i % STATUS_KEYS.length]
    const urgency = Math.round((4 + Math.random() * 5.8) * 10) / 10
    const createdAt = dayjs().subtract(i + 1, 'day').toISOString()

    const item = {
      id: i + 1,
      ticket_id: `ADS-2026-${String(i + 1).padStart(4, '0')}`,
      type: ['complaint', 'feedback', 'suggestion'][i % 3],
      category: issue.cat,
      description: issue.desc,
      unit: issue.unit,
      target_unit: issue.unit,
      is_anonymous: true, // Anonimitas Mutlak (Wajib)
      sender_name: 'Sivitas PENS (Anonim)',
      sender_role: ['Mahasiswa', 'Dosen', 'Tenaga Administrasi', 'Mitra'][i % 4],
      status: status,
      urgency_score: urgency,
      nlp_category: issue.cat,
      nlp_confidence: Math.round((0.82 + Math.random() * 0.16) * 100) / 100,
      sentiment: ['negative', 'neutral', 'negative', 'positive'][i % 4],
      sla_deadline: dayjs().add(2, 'day').toISOString(),
      attachments: i % 3 === 0 ? [{ url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60', name: 'foto_bukti.jpg' }] : [],
      
      // Tahap 3: Verifikasi Admin
      verification: ['received'].includes(status) ? null : {
        verified_by: 'Admin Sentral PENS',
        verified_at: dayjs(createdAt).add(3, 'hour').toISOString(),
        note: 'Aduan telah diverifikasi valid dan memenuhi syarat tindak lanjut.',
      },

      // Tahap 4: Disposisi Admin
      disposition: ['received', 'verified'].includes(status) ? null : {
        target_unit: issue.unit,
        assigned_pic: `Staf PIC ${issue.unit.split(' ')[0]}`,
        disposition_note: `Mohon unit segera menindaklanjuti aduan ini sesuai standar SLA pelayanan.`,
        disposition_by: 'Admin Sentral PENS',
        disposition_at: dayjs(createdAt).add(5, 'hour').toISOString(),
        target_sla_date: dayjs(createdAt).add(3, 'day').toISOString(),
      },

      // Tahap 5: Tindak Lanjut
      followups: ['received', 'verified', 'dispatched'].includes(status) ? [] : [
        {
          id: 1,
          by: `Teknisi ${issue.unit.split(' ')[0]}`,
          action_type: 'investigation',
          note: 'Pemeriksaan lapangan telah dilakukan oleh tim teknis.',
          evidence_url: null,
          status: 'in_progress',
          created_at: dayjs(createdAt).add(1, 'day').toISOString(),
        },
        ...(['action_taken', 'answered', 'resolved'].includes(status) ? [{
          id: 2,
          by: `Koordinator ${issue.unit.split(' ')[0]}`,
          action_type: 'maintenance',
          note: 'Tindakan perbaikan dan pengujian sistem/fasilitas telah selesai dilaksanakan dengan baik.',
          evidence_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=60',
          status: 'action_taken',
          created_at: dayjs(createdAt).add(1.5, 'day').toISOString(),
        }] : []),
      ],

      // Tahap 6: Jawaban Resmi Unit
      unit_answer: ['answered', 'resolved'].includes(status) ? {
        answer: `Terima kasih atas masukan yang disampaikan. Permasalahan mengenai ${issue.desc.toLowerCase().slice(0, 55)}... telah selesai ditangani oleh tim ${issue.unit}. Fasilitas/layanan telah berfungsi kembali secara normal.`,
        answered_by: `Kepala / Koordinator ${issue.unit}`,
        answered_at: dayjs(createdAt).add(2, 'day').toISOString(),
        attachments: [{ name: 'berita_acara_perbaikan.pdf', url: '#' }],
      } : null,

      // Tahap 7: Umpan Balik Stakeholder (Wajib untuk status resolved)
      feedback: status === 'resolved' ? {
        rating: 5 - (i % 2),
        aspect_speed: 5,
        aspect_clarity: 4,
        aspect_solution: 5,
        comment: 'Penanganan sangat cepat dan responsif. Terima kasih atas respon sigapnya.',
        submitted_at: dayjs(createdAt).add(2.5, 'day').toISOString(),
      } : null,

      created_at: createdAt,
      updated_at: dayjs().subtract(i % 2, 'day').toISOString(),
    }
    return item
  })

  saveMockComplaints(list)
  return list
}

let MOCK_COMPLAINTS = generateInitialMockData()

function saveMockComplaints(data) {
  try {
    localStorage.setItem('suaralens_mock_complaints_v2', JSON.stringify(data))
  } catch { /* ignore */ }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// =============================================
// COMPLAINT API FUNCTIONS
// =============================================

export async function getComplaints({ page = 1, limit = 10, ...filters } = {}) {
  if (USE_MOCK) {
    await delay(400)
    let data = [...MOCK_COMPLAINTS]
    if (filters.status)   data = data.filter(c => c.status === filters.status)
    if (filters.type)     data = data.filter(c => c.type === filters.type)
    if (filters.category) data = data.filter(c => c.category === filters.category)
    if (filters.unit)     data = data.filter(c => (c.target_unit || c.unit) === filters.unit)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      data = data.filter(c =>
        c.description.toLowerCase().includes(q) ||
        c.ticket_id.toLowerCase().includes(q) ||
        (c.unit && c.unit.toLowerCase().includes(q))
      )
    }
    const total = data.length
    const items = data.slice((page - 1) * limit, page * limit)
    return { items, total, page, limit }
  }
  const res = await api.get('/complaints', { params: { page, limit, ...filters } })
  return res.data
}

export async function getComplaint(id) {
  if (USE_MOCK) {
    await delay(300)
    return MOCK_COMPLAINTS.find(c => c.id === Number(id)) || null
  }
  const res = await api.get(`/complaints/${id}`)
  return res.data
}

export async function submitComplaint(formData) {
  if (USE_MOCK) {
    await delay(800)
    const newId = MOCK_COMPLAINTS.length + 1
    const ticketId = `ADS-2026-${String(newId).padStart(4, '0')}`
    const newComplaint = {
      id: newId,
      ticket_id: ticketId,
      type: formData.type || 'complaint',
      category: formData.category || 'facility',
      description: formData.description || '',
      unit: formData.unit || 'Lainnya/Lintas Unit',
      target_unit: formData.unit || 'Lainnya/Lintas Unit',
      is_anonymous: true, // Wajib & Mutlak
      sender_name: 'Sivitas PENS (Anonim)',
      sender_role: 'Mahasiswa',
      status: 'received', // Status Awal 1
      urgency_score: Math.round((5 + Math.random() * 4) * 10) / 10,
      nlp_category: formData.category || 'facility',
      nlp_confidence: 0.88,
      sentiment: 'negative',
      sla_deadline: dayjs().add(3, 'day').toISOString(),
      attachments: formData.attachments || [],
      verification: null,
      disposition: null,
      followups: [],
      unit_answer: null,
      feedback: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    MOCK_COMPLAINTS.unshift(newComplaint)
    saveMockComplaints(MOCK_COMPLAINTS)
    return { success: true, ticket_id: ticketId, id: newId }
  }
  const res = await api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getMyComplaints() {
  if (USE_MOCK) {
    await delay(300)
    return MOCK_COMPLAINTS.slice(0, 8)
  }
  const res = await api.get('/complaints/my')
  return res.data
}

// -------------------------------------------------------------
// TAHAP 3: Verifikasi Admin Sentral (received -> verified)
// -------------------------------------------------------------
export async function verifyComplaint(id, { verified = true, note = '' }) {
  if (USE_MOCK) {
    await delay(400)
    const target = MOCK_COMPLAINTS.find(c => c.id === Number(id))
    if (!target) throw new Error('Aduan tidak ditemukan')
    target.status = verified ? 'verified' : 'rejected'
    target.verification = {
      verified_by: 'Admin Sentral PENS',
      verified_at: new Date().toISOString(),
      note: note || 'Aduan telah diverifikasi dan disetujui untuk diproses ke unit terkait.',
    }
    target.updated_at = new Date().toISOString()
    saveMockComplaints(MOCK_COMPLAINTS)
    return { success: true, complaint: target }
  }
  const res = await api.patch(`/admin/complaints/${id}/verify`, { verified, note })
  return res.data
}

// -------------------------------------------------------------
// TAHAP 4: Disposisi Admin ke 14 Unit (verified -> dispatched)
// -------------------------------------------------------------
export async function dispatchComplaint(id, { target_unit, assigned_pic = '', disposition_note = '', target_sla_date = null }) {
  if (USE_MOCK) {
    await delay(500)
    const target = MOCK_COMPLAINTS.find(c => c.id === Number(id))
    if (!target) throw new Error('Aduan tidak ditemukan')
    target.target_unit = target_unit
    target.unit = target_unit
    target.status = 'dispatched'
    target.disposition = {
      target_unit,
      assigned_pic: assigned_pic || `Koordinator ${target_unit}`,
      disposition_note: disposition_note || 'Mohon segera ditindaklanjuti sesuai SOP unit.',
      disposition_by: 'Admin Sentral PENS',
      disposition_at: new Date().toISOString(),
      target_sla_date: target_sla_date || dayjs().add(3, 'day').toISOString(),
    }
    target.updated_at = new Date().toISOString()
    saveMockComplaints(MOCK_COMPLAINTS)
    return { success: true, complaint: target }
  }
  const res = await api.post(`/admin/complaints/${id}/disposition`, { target_unit, assigned_pic, disposition_note, target_sla_date })
  return res.data
}

// -------------------------------------------------------------
// TAHAP 5a: Unit Mengakui & Memulai Tugas (dispatched -> in_progress)
// -------------------------------------------------------------
export async function acceptComplaintByUnit(id, { pic_name = '', note = '' }) {
  if (USE_MOCK) {
    await delay(400)
    const target = MOCK_COMPLAINTS.find(c => c.id === Number(id))
    if (!target) throw new Error('Aduan tidak ditemukan')
    target.status = 'in_progress'
    if (!target.followups) target.followups = []
    target.followups.push({
      id: target.followups.length + 1,
      by: pic_name || `Staf ${target.target_unit || target.unit}`,
      action_type: 'investigation',
      note: note || 'Disposisi diterima oleh unit. Penanganan dan pengecekan teknis sedang berlangsung.',
      evidence_url: null,
      status: 'in_progress',
      created_at: new Date().toISOString(),
    })
    target.updated_at = new Date().toISOString()
    saveMockComplaints(MOCK_COMPLAINTS)
    return { success: true, complaint: target }
  }
  const res = await api.post(`/unit/complaints/${id}/accept`, { pic_name, note })
  return res.data
}

// -------------------------------------------------------------
// TAHAP 5b: Unit Catat Tindak Lanjut Teknis (in_progress -> action_taken)
// -------------------------------------------------------------
export async function addUnitFollowUp(id, { action_type = 'maintenance', note, evidence_url = null, performed_by = '' }) {
  if (USE_MOCK) {
    await delay(500)
    const target = MOCK_COMPLAINTS.find(c => c.id === Number(id))
    if (!target) throw new Error('Aduan tidak ditemukan')
    target.status = 'action_taken'
    if (!target.followups) target.followups = []
    target.followups.push({
      id: target.followups.length + 1,
      by: performed_by || `Teknisi ${target.target_unit || target.unit}`,
      action_type,
      note,
      evidence_url,
      status: 'action_taken',
      created_at: new Date().toISOString(),
    })
    target.updated_at = new Date().toISOString()
    saveMockComplaints(MOCK_COMPLAINTS)
    return { success: true, complaint: target }
  }
  const res = await api.post(`/unit/complaints/${id}/followup`, { action_type, note, evidence_url, performed_by })
  return res.data
}

// -------------------------------------------------------------
// TAHAP 6: Unit Terbitkan Jawaban Resmi (action_taken/in_progress -> answered)
// -------------------------------------------------------------
export async function submitUnitOfficialAnswer(id, { answer, answered_by = '', attachments = [] }) {
  if (USE_MOCK) {
    await delay(600)
    const target = MOCK_COMPLAINTS.find(c => c.id === Number(id))
    if (!target) throw new Error('Aduan tidak ditemukan')
    target.status = 'answered'
    target.unit_answer = {
      answer,
      answered_by: answered_by || `Kepala / Staf ${target.target_unit || target.unit}`,
      answered_at: new Date().toISOString(),
      attachments: attachments.length ? attachments : [{ name: 'lampiran_penyelesaian.pdf', url: '#' }],
    }
    target.updated_at = new Date().toISOString()
    saveMockComplaints(MOCK_COMPLAINTS)
    return { success: true, complaint: target }
  }
  const res = await api.post(`/unit/complaints/${id}/answer`, { answer, answered_by, attachments })
  return res.data
}

// -------------------------------------------------------------
// TAHAP 7 & 8: Feedback Wajib Stakeholder -> Selesai (answered -> resolved)
// -------------------------------------------------------------
export async function submitStakeholderFeedback(id, { rating, aspect_speed = 5, aspect_clarity = 5, aspect_solution = 5, comment = '' }) {
  if (USE_MOCK) {
    await delay(600)
    const target = MOCK_COMPLAINTS.find(c => c.id === Number(id))
    if (!target) throw new Error('Aduan tidak ditemukan')
    if (target.status !== 'answered') {
      throw new Error('Tiket hanya dapat diberi feedback jika sudah berstatus Dijawab oleh unit.')
    }
    target.status = 'resolved' // Berpindah ke Selesai
    target.feedback = {
      rating: Number(rating) || 5,
      aspect_speed: Number(aspect_speed) || 5,
      aspect_clarity: Number(aspect_clarity) || 5,
      aspect_solution: Number(aspect_solution) || 5,
      comment: comment || 'Terima kasih atas penyelesaian aduan.',
      submitted_at: new Date().toISOString(),
    }
    target.updated_at = new Date().toISOString()
    saveMockComplaints(MOCK_COMPLAINTS)
    return { success: true, complaint: target }
  }
  const res = await api.post(`/complaints/${id}/feedback`, { rating, aspect_speed, aspect_clarity, aspect_solution, comment })
  return res.data
}

// -------------------------------------------------------------
// Modul Dashboard Spesifik per Unit
// -------------------------------------------------------------
export async function getUnitDashboardStats(unitName) {
  if (USE_MOCK) {
    await delay(350)
    const unitList = MOCK_COMPLAINTS.filter(c => (c.target_unit || c.unit) === unitName)
    const total = unitList.length
    const dispatched = unitList.filter(c => c.status === 'dispatched').length
    const inProgress = unitList.filter(c => c.status === 'in_progress').length
    const actionTaken = unitList.filter(c => c.status === 'action_taken').length
    const answered = unitList.filter(c => c.status === 'answered').length
    const resolved = unitList.filter(c => c.status === 'resolved').length
    
    // Average Rating
    const withFeedback = unitList.filter(c => c.feedback?.rating)
    const avgRating = withFeedback.length
      ? Math.round((withFeedback.reduce((acc, curr) => acc + curr.feedback.rating, 0) / withFeedback.length) * 10) / 10
      : 4.8

    // SLA compliance estimate
    const slaRate = Math.min(100, Math.round((resolved + answered) / (Math.max(1, total)) * 100))

    return {
      unitName,
      total,
      dispatched,
      inProgress,
      actionTaken,
      answered,
      resolved,
      activePending: dispatched + inProgress + actionTaken,
      avgRating,
      feedbackCount: withFeedback.length,
      slaComplianceRate: Math.max(78, slaRate),
      avgResolutionDays: 2.1,
      items: unitList,
    }
  }
  const res = await api.get(`/unit/stats`, { params: { unit: unitName } })
  return res.data
}

export async function updateComplaintStatus(id, status, note = '') {
  if (USE_MOCK) {
    await delay(300)
    const target = MOCK_COMPLAINTS.find(c => c.id === Number(id))
    if (target) {
      target.status = status
      target.updated_at = new Date().toISOString()
      saveMockComplaints(MOCK_COMPLAINTS)
    }
    return { success: true }
  }
  const res = await api.patch(`/complaints/${id}/status`, { status, note })
  return res.data
}

export async function replyToComplaint(id, message) {
  if (USE_MOCK) {
    await delay(300)
    return { success: true }
  }
  const res = await api.post(`/complaints/${id}/reply`, { message })
  return res.data
}
