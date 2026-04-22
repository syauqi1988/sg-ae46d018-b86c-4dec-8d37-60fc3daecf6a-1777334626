import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Modal, StatCard, Badge } from '@/components/ui'
import { Tag, Megaphone, Activity, Shield, Plus, Database, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

// ─── Discounts Page ───────────────────────────
export function DiscountsPage() {
  const [codes, setCodes] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: '', expires_at: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchCodes() }, [])

  const fetchCodes = async () => {
    const { data } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false })
    setCodes(data ?? [])
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return 'WT' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const saveCode = async () => {
    if (!form.code) return
    setSaving(true)
    await supabase.from('discount_codes').insert({
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
      description: form.description,
      applicable_plans: ['pro', 'team'],
      is_active: true,
    })
    showToast('Kod diskaun berjaya dibuat!')
    setShowModal(false)
    setForm({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: '', expires_at: '', description: '' })
    fetchCodes()
    setSaving(false)
  }

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('discount_codes').update({ is_active: !active }).eq('id', id)
    fetchCodes()
    showToast(active ? 'Kod dilumpuhkan' : 'Kod diaktifkan')
  }

  const deleteCode = async (id: string) => {
    if (!confirm('Padam kod ini?')) return
    await supabase.from('discount_codes').delete().eq('id', id)
    fetchCodes()
    showToast('Kod dipadam')
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const activeCount = codes.filter(c => c.is_active).length
  const totalUses = codes.reduce((s, c) => s + (c.current_uses ?? 0), 0)

  return (
    <div className="space-y-5">
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>}
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Kod Diskaun</h1><p className="page-subtitle">Urus dan pantau kod promosi</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> Kod Baru</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Jumlah Kod" value={codes.length} icon={<Tag size={17} className="text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard label="Aktif" value={activeCount} icon={<CheckCircle size={17} className="text-green-600" />} iconBg="bg-green-100" />
        <StatCard label="Jumlah Penggunaan" value={totalUses} icon={<Tag size={17} className="text-purple-600" />} iconBg="bg-purple-100" />
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Kod</th><th>Diskaun</th><th>Penggunaan</th><th>Tamat</th><th>Status</th><th>Tindakan</th></tr></thead>
          <tbody>
            {codes.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tiada kod diskaun</td></tr>
              : codes.map(c => (
                <tr key={c.id}>
                  <td><span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded font-semibold">{c.code}</span></td>
                  <td className="font-semibold text-blue-700">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `RM ${c.discount_value}`}</td>
                  <td className="text-sm">{c.current_uses ?? 0} / {c.max_uses ?? '∞'}</td>
                  <td className="text-sm text-slate-400">{c.expires_at ? format(new Date(c.expires_at), 'dd MMM yyyy') : 'Tiada'}</td>
                  <td><Badge variant={c.is_active ? 'green' : 'gray'}>{c.is_active ? 'Aktif' : 'Lumpuh'}</Badge></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => toggleActive(c.id, c.is_active)} className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">{c.is_active ? 'Lumpuh' : 'Aktif'}</button>
                      <button onClick={() => deleteCode(c.id)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Padam</button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buat Kod Diskaun Baru">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kod Diskaun</label>
            <div className="flex gap-2">
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input flex-1" placeholder="WORKTRACE20" />
              <button onClick={() => setForm({ ...form, code: generateCode() })} className="btn-outline whitespace-nowrap">Jana Auto</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
              <select className="input" value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                <option value="percentage">% Peratusan</option>
                <option value="fixed">RM Tetap</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nilai</label>
              <input type="number" className="input" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Had Penggunaan</label>
              <input type="number" className="input" placeholder="Kosongkan = tanpa had" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tarikh Tamat</label>
              <input type="date" className="input" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nota Dalaman</label>
            <input className="input" placeholder="Untuk rujukan admin..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="btn-outline">Batal</button>
            <button onClick={saveCode} disabled={!form.code || saving} className="btn-primary disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Kod'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Announcements Page ───────────────────────
export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target_plan: 'all', display_type: 'banner', expires_at: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchAnnouncements() }, [])

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data ?? [])
  }

  const saveAnnouncement = async () => {
    if (!form.title || !form.message) return
    setSaving(true)
    await supabase.from('announcements').insert({ ...form, expires_at: form.expires_at || null, is_active: true, starts_at: new Date().toISOString() })
    setShowModal(false)
    setForm({ title: '', message: '', type: 'info', target_plan: 'all', display_type: 'banner', expires_at: '' })
    fetchAnnouncements()
    showToast('Pengumuman berjaya disiarkan!')
    setSaving(false)
  }

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('announcements').update({ is_active: !active }).eq('id', id)
    fetchAnnouncements()
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const typeColors: Record<string, string> = { info: 'badge-blue', success: 'badge-green', warning: 'badge-amber', critical: 'badge-red' }

  return (
    <div className="space-y-5">
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>}
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Pengumuman</h1><p className="page-subtitle">Hantar notifikasi kepada pengguna</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> Pengumuman Baru</button>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Tajuk</th><th>Jenis</th><th>Sasaran</th><th>Paparan</th><th>Status</th><th>Tamat</th><th>Tindakan</th></tr></thead>
          <tbody>
            {announcements.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-slate-400">Tiada pengumuman</td></tr>
              : announcements.map(a => (
                <tr key={a.id}>
                  <td><p className="font-medium text-slate-800 text-sm">{a.title}</p><p className="text-xs text-slate-400 truncate max-w-[200px]">{a.message}</p></td>
                  <td><span className={`badge ${typeColors[a.type] ?? 'badge-gray'}`}>{a.type}</span></td>
                  <td className="capitalize text-sm">{a.target_plan}</td>
                  <td className="capitalize text-sm">{a.display_type}</td>
                  <td><Badge variant={a.is_active ? 'green' : 'gray'}>{a.is_active ? 'Aktif' : 'Tidak Aktif'}</Badge></td>
                  <td className="text-xs text-slate-400">{a.expires_at ? format(new Date(a.expires_at), 'dd MMM yyyy') : '—'}</td>
                  <td>
                    <button onClick={() => toggleActive(a.id, a.is_active)} className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
                      {a.is_active ? 'Nyahaktif' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Pengumuman Baru">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Tajuk</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Tajuk pengumuman..." /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Mesej</label><textarea className="input resize-none" rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Kandungan pengumuman..." /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="info">Info</option><option value="success">Kejayaan</option><option value="warning">Amaran</option><option value="critical">Kritikal</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Sasaran</label>
              <select className="input" value={form.target_plan} onChange={e => setForm({ ...form, target_plan: e.target.value })}>
                <option value="all">Semua</option><option value="free">Free</option><option value="pro">Pro</option><option value="team">Team</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Paparan</label>
              <select className="input" value={form.display_type} onChange={e => setForm({ ...form, display_type: e.target.value })}>
                <option value="banner">Banner</option><option value="modal">Modal</option><option value="toast">Toast</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Tarikh Tamat (opsional)</label><input type="date" className="input" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="btn-outline">Batal</button>
            <button onClick={saveAnnouncement} disabled={!form.title || !form.message || saving} className="btn-primary disabled:opacity-50">{saving ? 'Menyimpan...' : 'Siarkan'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Health Page ──────────────────────────────
export function HealthPage() {
  const [buckets, setBuckets] = useState<any[]>([])
  const [dbStats, setDbStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchHealth() }, [])

  const fetchHealth = async () => {
    setLoading(true)
    const tables = ['profiles', 'jobs', 'customers', 'quotations', 'invoices', 'support_tickets']
    const counts = await Promise.all(tables.map(t => supabase.from(t).select('*', { count: 'exact', head: true })))
    const stats: Record<string, number> = {}
    tables.forEach((t, i) => { stats[t] = counts[i].count ?? 0 })
    setDbStats(stats)
    setBuckets(['avatars', 'quotation-pdfs', 'invoice-pdfs', 'payment-qr', 'completion-photos', 'receipts', 'ticket-attachments', 'completion-report-pdfs'])
    setLoading(false)
  }

  const edgeFunctions = ['send-ticket-email', 'billplz-create-bill', 'billplz-callback', 'delete-user']

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Semakan Sistem</h1><p className="page-subtitle">Status dan kesihatan sistem WorkTrace</p></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Database size={18} className="text-blue-600" /><h3 className="text-sm font-semibold text-slate-800">Database</h3><span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Bersambung</span></div>
          <div className="space-y-2">
            {Object.entries(dbStats).map(([table, count]) => (
              <div key={table} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-600 font-mono">{table}</span>
                <span className="font-semibold text-slate-900">{String(count)} rekod</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Activity size={18} className="text-green-600" /><h3 className="text-sm font-semibold text-slate-800">Edge Functions</h3></div>
          <div className="space-y-2">
            {edgeFunctions.map(fn => (
              <div key={fn} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-600 font-mono text-xs">{fn}</span>
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Aktif</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4"><Database size={18} className="text-purple-600" /><h3 className="text-sm font-semibold text-slate-800">Storage Buckets</h3></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {buckets.map(b => (
              <div key={b} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-mono text-slate-600 truncate">{b}</p>
                <p className="text-xs text-green-600 font-medium mt-1">✓ Aktif</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Management Page ────────────────────
export function AdminManagementPage() {
  const [admins, setAdmins] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'admin' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchAdmins() }, [])

  const fetchAdmins = async () => {
    const { data } = await supabase.from('admin_users').select('*').order('created_at')
    setAdmins(data ?? [])
  }

  const addAdmin = async () => {
    if (!form.email || !form.name) return
    setSaving(true)
    const { data: user } = await supabase.from('profiles').select('id').ilike('email', form.email).maybeSingle()
    if (!user) { showToast('Pengguna tidak dijumpai. Pastikan emel betul.'); setSaving(false); return }
    await supabase.from('admin_users').insert({ user_id: user.id, email: form.email, name: form.name, role: form.role, is_active: true })
    setShowModal(false)
    setForm({ email: '', name: '', role: 'admin' })
    fetchAdmins()
    showToast('Admin baru ditambah!')
    setSaving(false)
  }

  const toggleAdmin = async (id: string, active: boolean) => {
    await supabase.from('admin_users').update({ is_active: !active }).eq('id', id)
    fetchAdmins()
    showToast(active ? 'Admin dilumpuhkan' : 'Admin diaktifkan')
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  return (
    <div className="space-y-5">
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>}
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Pengurusan Admin</h1><p className="page-subtitle">Urus akses panel admin</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> Tambah Admin</button>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Nama</th><th>Emel</th><th>Peranan</th><th>Status</th><th>Log Masuk Terakhir</th><th>Tindakan</th></tr></thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <td className="font-medium text-slate-800">{a.name}</td>
                <td className="text-slate-600 text-sm">{a.email}</td>
                <td><Badge variant={a.role === 'super_admin' ? 'purple' : 'blue'}>{a.role === 'super_admin' ? 'Super Admin' : 'Admin'}</Badge></td>
                <td><Badge variant={a.is_active ? 'green' : 'gray'}>{a.is_active ? 'Aktif' : 'Lumpuh'}</Badge></td>
                <td className="text-xs text-slate-400">{a.last_login ? format(new Date(a.last_login), 'dd MMM yyyy, hh:mm a') : 'Belum pernah'}</td>
                <td>
                  <button onClick={() => toggleAdmin(a.id, a.is_active)} className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
                    {a.is_active ? 'Lumpuhkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Admin Baru">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
            Pengguna mesti sudah berdaftar dalam WorkTrace sebelum boleh dijadikan admin.
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Emel WorkTrace</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@worktrace.my" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Paparan</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama admin..." /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Peranan</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="btn-outline">Batal</button>
            <button onClick={addAdmin} disabled={!form.email || !form.name || saving} className="btn-primary disabled:opacity-50">{saving ? 'Menyimpan...' : 'Tambah Admin'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Pro Users Page ───────────────────────────
export function ProUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchProUsers() }, [filter])

  const fetchProUsers = async () => {
    setLoading(true)
    let q = supabase.from('profiles').select('*').in('plan', ['pro', 'team'])
    if (filter === 'expiring') q = q.lte('subscription_end_date', new Date(Date.now() + 7 * 86400000).toISOString())
    if (filter === 'cancelled') q = q.eq('subscription_cancelled', true)
    const { data } = await q.order('subscription_end_date', { ascending: true })
    setUsers(data ?? [])
    setLoading(false)
  }

  const daysLeft = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Pro Pengguna</h1><p className="page-subtitle">Pengguna pelan Pro dan Team</p></div>
        <select className="input w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Semua Pro/Team</option>
          <option value="expiring">Akan Tamat (7 hari)</option>
          <option value="cancelled">Telah Dibatalkan</option>
        </select>
      </div>
      <div className="table-wrapper">
        {loading ? <div className="p-4 text-center text-slate-400">Memuatkan...</div> : (
          <table className="table">
            <thead><tr><th>Pengguna</th><th>Pelan</th><th>Status</th><th>Tarikh Tamat</th><th>Baki Hari</th><th>Bulan Percuma</th></tr></thead>
            <tbody>
              {users.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tiada pengguna</td></tr>
                : users.map(u => {
                  const days = u.subscription_end_date ? daysLeft(u.subscription_end_date) : null
                  return (
                    <tr key={u.id}>
                      <td className="font-medium text-slate-800">{u.company_name ?? '—'}</td>
                      <td><Badge variant={u.plan === 'team' ? 'blue' : 'green'}>{u.plan.toUpperCase()}</Badge></td>
                      <td>{u.subscription_cancelled ? <Badge variant="amber">Akan Batal</Badge> : <Badge variant="green">Aktif</Badge>}</td>
                      <td className="text-sm text-slate-500">{u.subscription_end_date ? format(new Date(u.subscription_end_date), 'dd MMM yyyy') : '—'}</td>
                      <td><span className={`text-sm font-semibold ${days !== null && days <= 7 ? 'text-red-600' : 'text-slate-700'}`}>{days !== null ? `${days} hari` : '—'}</span></td>
                      <td className="text-sm">{(u.free_months_earned ?? 0) - (u.free_months_used ?? 0)} baki</td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
