import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, Users, FileText, Receipt, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar, PlanBadge, Badge, StatCard, Skeleton } from '@/components/ui'
import { format } from 'date-fns'

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ jobs: 0, customers: 0, quotations: 0, invoices: 0, revenue: 0 })
  const [tickets, setTickets] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [tab, setTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (id) fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const [profileRes, jobsRes, customersRes, quotesRes, invoicesRes, ticketsRes, eventsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id!).single(),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', id!),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', id!),
      supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('user_id', id!),
      supabase.from('invoices').select('total, status').eq('user_id', id!),
      supabase.from('support_tickets').select('*').eq('user_id', id!).order('created_at', { ascending: false }),
      supabase.from('subscription_events').select('*').eq('user_id', id!).order('created_at', { ascending: false }),
    ])
    setProfile(profileRes.data)
    const revenue = (invoicesRes.data ?? []).filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (i.total ?? 0), 0)
    setStats({ jobs: jobsRes.count ?? 0, customers: customersRes.count ?? 0, quotations: quotesRes.count ?? 0, invoices: (invoicesRes.data ?? []).length, revenue })
    setTickets(ticketsRes.data ?? [])
    setEvents(eventsRes.data ?? [])
    setLoading(false)
  }

  const handlePlanChange = async (plan: string) => {
    setActionLoading(true)
    const updates: any = { plan }
    if (plan !== 'free') { updates.subscription_status = 'active'; const end = new Date(); end.setMonth(end.getMonth() + 1); updates.subscription_end_date = end.toISOString() }
    else { updates.subscription_status = 'expired' }
    await supabase.from('profiles').update(updates).eq('id', id!)
    showToast(`Pelan dikemaskini kepada ${plan.toUpperCase()}`)
    fetchAll()
    setActionLoading(false)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const tabs = ['info', 'aktiviti', 'langganan', 'tiket']
  const tabLabels: Record<string, string> = { info: 'Maklumat', aktiviti: 'Aktiviti', langganan: 'Langganan', tiket: 'Tiket' }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  )

  if (!profile) return (
    <div className="text-center py-20 text-slate-400">
      <p>Pengguna tidak dijumpai.</p>
      <button onClick={() => navigate('/users')} className="btn-outline mt-4">Kembali</button>
    </div>
  )

  return (
    <div className="space-y-5 max-w-5xl">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>
      )}

      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Kembali ke Pengguna
      </button>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={profile.company_name ?? 'U'} size="lg" />
            <div>
              <h2 className="font-semibold text-slate-900">{profile.company_name ?? '—'}</h2>
              <p className="text-xs text-slate-400">{profile.phone ?? '—'}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PlanBadge plan={profile.plan} />
            {profile.subscription_status === 'active' && <Badge variant="green">Aktif</Badge>}
            {profile.subscription_cancelled && <Badge variant="amber">Akan Batal</Badge>}
            {profile.lhdn_enabled && <Badge variant="blue">LHDN</Badge>}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Referral Code</span><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{profile.referral_code ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Rujukan</span><span>{profile.referral_count ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Bulan Percuma</span><span>{(profile.free_months_earned ?? 0) - (profile.free_months_used ?? 0)} baki</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Tarikh Daftar</span><span>{format(new Date(profile.created_at), 'dd MMM yyyy')}</span></div>
            {profile.subscription_end_date && (
              <div className="flex justify-between"><span className="text-slate-400">Tamat</span><span>{format(new Date(profile.subscription_end_date), 'dd MMM yyyy')}</span></div>
            )}
          </div>

          {/* Admin Actions */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tindakan Admin</p>
            <button disabled={actionLoading || profile.plan === 'pro'} onClick={() => handlePlanChange('pro')}
              className="w-full py-2 px-3 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-40 text-left">
              ↑ Naik Taraf ke Pro
            </button>
            <button disabled={actionLoading || profile.plan === 'free'} onClick={() => handlePlanChange('free')}
              className="w-full py-2 px-3 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-40 text-left">
              ↓ Turunkan ke Free
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Kerja" value={stats.jobs} icon={<Briefcase size={16} className="text-blue-600" />} iconBg="bg-blue-100" />
            <StatCard label="Pelanggan" value={stats.customers} icon={<Users size={16} className="text-green-600" />} iconBg="bg-green-100" />
            <StatCard label="Pendapatan" value={`RM ${stats.revenue.toLocaleString()}`} icon={<TrendingUp size={16} className="text-purple-600" />} iconBg="bg-purple-100" />
          </div>

          {/* Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50">
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tabLabels[t]}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'info' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['Nama Syarikat', profile.company_name],
                    ['No. Telefon', profile.phone],
                    ['Alamat', profile.address],
                    ['TIN LHDN', profile.tin_number],
                    ['Kod MSIC', profile.msic_code],
                    ['SST Berdaftar', profile.sst_registered ? 'Ya' : 'Tidak'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-slate-400 mb-0.5">{k}</p>
                      <p className="text-slate-800 font-medium">{v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'aktiviti' && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Jumlah Kerja', value: stats.jobs, icon: <Briefcase size={16} /> },
                    { label: 'Pelanggan', value: stats.customers, icon: <Users size={16} /> },
                    { label: 'Sebut Harga', value: stats.quotations, icon: <FileText size={16} /> },
                    { label: 'Invois', value: stats.invoices, icon: <Receipt size={16} /> },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="text-blue-500">{s.icon}</div>
                      <div><p className="text-xs text-slate-400">{s.label}</p><p className="font-semibold">{s.value}</p></div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'langganan' && (
                <div className="space-y-3">
                  {events.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">Tiada rekod langganan</p> : events.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium capitalize">{e.event_type}</p>
                        <p className="text-xs text-slate-400">{e.plan} · {e.billing_period}</p>
                      </div>
                      <div className="text-right">
                        {e.amount && <p className="text-sm font-semibold">RM {e.amount}</p>}
                        <p className="text-xs text-slate-400">{format(new Date(e.created_at), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'tiket' && (
                <div className="space-y-3">
                  {tickets.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">Tiada tiket sokongan</p> : tickets.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{t.ticket_number} — {t.subject}</p>
                        <p className="text-xs text-slate-400">{t.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status === 'open' ? 'bg-blue-100 text-blue-700' : t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
