import { Home, MessageSquare, Plus, BarChart3, Users, Paperclip, Bell } from 'lucide-react'

/* ---------- Bingkai ponsel (desain responsif berbasis proporsi) ---------- */
export function PhoneFrame({ children, className = '', style }) {
  return (
    <div className={className} style={style}>
      <svg width="100%" viewBox="0 0 433 882" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg" className="block drop-shadow-2xl">
        <path d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z" style={{ fill: 'var(--phone-bezel)' }} />
        <path opacity="0.5" d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M21.25 75C21.25 44.2101 46.2101 19.25 77 19.25H355C385.79 19.25 410.75 44.2101 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.2101 862.75 21.25 837.79 21.25 807V75Z" style={{ fill: 'var(--phone-screen)' }} />
        <foreignObject x="21.25" y="19.25" width="389.5" height="843.5">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%', borderRadius: 55.75, overflow: 'hidden', position: 'relative', background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'Geist, sans-serif' }}>
            {children}
          </div>
        </foreignObject>
        <path d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z" style={{ fill: 'var(--phone-bezel)' }} />
        <path d="M249 48.5C249 42.701 253.701 38 259.5 38C265.299 38 270 42.701 270 48.5C270 54.299 265.299 59 259.5 59C253.701 59 249 54.299 249 48.5Z" style={{ fill: '#111' }} />
        <path d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z" fill="rgba(255,255,255,0.3)" />
      </svg>
    </div>
  )
}

/* ---------- Layar mockup ponsel ---------- */
const NAVY = 'var(--color-navy)'
const GOLD = 'var(--color-gold)'
const BLUE = 'var(--color-primary)'
const LINE = 'var(--color-border)'
const MUTE = 'var(--color-text-muted)'

function ScreenHeader({ title, sub }) {
  return (
    <div style={{ padding: '70px 26px 16px' }}>
      <div style={{ fontSize: 15, color: MUTE }}>{sub}</div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 2 }}>{title}</div>
    </div>
  )
}

function TabBar({ active }) {
  const items = [Home, MessageSquare, Plus, BarChart3, Users]
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, borderTop: `1px solid ${LINE}`, background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 18 }}>
      {items.map((Ic, i) => (
        <div key={i} style={{ width: 52, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: i === 2 ? GOLD : 'transparent', color: i === 2 ? NAVY : i === active ? BLUE : MUTE }}>
          <Ic size={24} />
        </div>
      ))}
    </div>
  )
}

function Chip({ children, color = BLUE }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 999, color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {children}
    </span>
  )
}

export function ScreenList({ L }) {
  const rows = [
    ['SL-0247', L('AC ruang lab 3 tidak dingin', 'Lab 3 AC not cooling'), L('Diproses', 'In progress'), 'var(--color-status-warning)'],
    ['SL-0244', L('Wi-Fi gedung D putus-putus', 'Building D Wi-Fi unstable'), L('Selesai', 'Resolved'), 'var(--color-status-success)'],
    ['SL-0239', L('Antrean KRS terlalu lama', 'KRS queue too long'), L('Baru', 'New'), BLUE],
    ['SL-0231', L('Buku referensi kurang', 'Not enough references'), L('Selesai', 'Resolved'), 'var(--color-status-success)'],
  ]
  return (
    <>
      <ScreenHeader sub={L('Selamat pagi, Rina', 'Good morning, Rina')} title={L('Aduan Saya', 'My Complaints')} />
      <div style={{ margin: '0 26px', padding: 18, borderRadius: 18, background: NAVY, color: '#fff', boxShadow: '0 8px 20px rgba(10,36,99,0.25)' }}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>{L('Progres terbaru', 'Latest progress')} · #SL-0247</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 6 }}>{L('Tahap 4 dari 5', 'Step 4 of 5')}</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
          {[1, 2, 3, 4, 5].map(n => <div key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: n <= 4 ? GOLD : 'rgba(255,255,255,.25)' }} />)}
        </div>
      </div>
      <div style={{ padding: '22px 26px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(([id, title, st, col]) => (
          <div key={id} style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 16px', background: 'var(--color-bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: MUTE, fontFamily: 'Geist Mono, monospace' }}>{id}</span>
              <Chip color={col}>{st}</Chip>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}>{title}</div>
          </div>
        ))}
      </div>
      <TabBar active={1} />
    </>
  )
}

export function ScreenForm({ L }) {
  return (
    <>
      <ScreenHeader sub={L('Langkah 3 dari 5', 'Step 3 of 5')} title={L('Ajukan Aduan', 'Submit Complaint')} />
      <div style={{ padding: '0 26px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1, 2, 3, 4, 5].map(n => <div key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: n <= 3 ? BLUE : LINE }} />)}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 26 }}>{L('Kategori', 'Category')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {[L('Fasilitas', 'Facilities'), L('Akademik', 'Academic'), L('Administrasi', 'Admin'), L('Keuangan', 'Finance')].map((c, i) => (
            <span key={c} style={{ fontSize: 14, padding: '8px 14px', borderRadius: 10, border: `1px solid ${i === 0 ? NAVY : LINE}`, background: i === 0 ? NAVY : 'var(--color-surface)', color: i === 0 ? '#fff' : 'var(--color-text)' }}>{c}</span>
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 26 }}>{L('Deskripsi aduan', 'Complaint details')}</div>
        <div style={{ marginTop: 10, border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, height: 190, fontSize: 15, lineHeight: 1.5, background: 'var(--color-bg-secondary)' }}>
          {L('Pendingin ruangan lab 3 tidak berfungsi sejak Senin. Praktikum menjadi terganggu karena suhu ruangan terlalu panas.', 'The lab 3 air conditioner has not worked since Monday. Practical sessions are disrupted because the room is too hot.')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: MUTE, marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Paperclip size={14} />{L('Lampirkan bukti', 'Attach evidence')}</span>
          <span>112 / 50+</span>
        </div>
        <div style={{ marginTop: 30, background: GOLD, color: NAVY, textAlign: 'center', padding: '15px 0', fontSize: 16, fontWeight: 700, borderRadius: 12, boxShadow: '0 8px 20px -6px rgba(245,183,0,0.6)' }}>{L('Lanjut', 'Continue')}</div>
      </div>
      <TabBar active={2} />
    </>
  )
}

export function ScreenDash({ L }) {
  const bars = [38, 52, 44, 66, 58, 82, 74]
  return (
    <>
      <ScreenHeader sub={L('Portal Stakeholder', 'Stakeholder Portal')} title={L('Ringkasan', 'Overview')} />
      <div style={{ padding: '0 26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[[L('Total aduan', 'Total'), '1.284'], [L('Rata-rata SLA', 'Avg SLA'), '2,4 hr'], [L('Sentimen negatif', 'Negative'), '31%'], [L('Urgensi tinggi', 'High urgency'), '12']].map(([k, v], i) => (
            <div key={k} style={{ border: `1px solid ${i === 3 ? BLUE : LINE}`, borderRadius: 12, padding: '12px 14px', background: 'var(--color-bg-secondary)' }}>
              <div style={{ fontSize: 12.5, color: MUTE }}>{k}</div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 4, color: i === 3 ? BLUE : 'var(--color-text)' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, marginTop: 14, padding: 16, background: 'var(--color-bg-secondary)' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{L('Tren 7 hari', '7-day trend')}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, marginTop: 14 }}>
            {bars.map((h, i) => <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0', background: i === 5 ? GOLD : BLUE }} />)}
          </div>
        </div>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, marginTop: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-bg-secondary)' }}>
          <Bell size={18} color={BLUE} />
          <div style={{ fontSize: 14 }}><b>SL-0247</b> · {L('Urgensi 8, perlu ditinjau', 'Urgency 8, needs review')}</div>
        </div>
      </div>
      <TabBar active={3} />
    </>
  )
}
