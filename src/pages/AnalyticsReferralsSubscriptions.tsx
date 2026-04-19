// ─── Analytics Page ──────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StatCard } from '@/components/ui'
import { DollarSign, TrendingUp, Users, TrendingDown } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export function AnalyticsPage() {
  const [stats, setStats] = useState({ revenue: 0, mrr: 0, newPaid: 0, churned: 0 })
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [planDist, setPlanDist] = useState<any[]>([])
  const [topUsers, setTopUsers] = useState<any[]>([])
  const [range, setRange] = useState('30')

  useEffect(() => { fetchAll() }, [range])

  const fetchAll = async () => {
    const [proCount, teamCount, freeCount, events] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'team'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'free'),
      supabase.from('subscription_events').select('amount, created_at, event_type').eq('event_type', 'subscribed'),
    ])
    const totalRevenue = (events.data ?? []).reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
    const mrr = ((proCount.count ?? 0) * 49) + ((teamCount.count ?? 0) * 99)
    setStats({ revenue: totalRevenue, mrr, newPaid: proCount.count ?? 0, churned: 0 })
    setPlanDist([
      { name: 'Free', value: freeCount.count ?? 0, color: '#94A3B8' },
      { name: 'Pro', value: proCount.count ?? 0, color: '#2563EB' },
      { name: 'Team', value: teamCount.count ?? 0, color: '#16A34A' },
    ])
    const months = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis']
    setRevenueData(months.map((m, i) => ({
      bulan: m,
      Pendapatan: (events.data ?? []).filter((e: any) => new Date(e.created_at).getMonth() === i).reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
    })))
    const { data: inv } = await supabase.from('invoices').select('user_id, total').eq('status', 'Paid')
    const byUser: Record<string, number> = {}
    ;(inv ?? []).forEach((i: any) => { byUser[i.user_id] = (byUser[i.user_id] ?? 0) + (i.total ?? 0) })
    const sorted = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 10)
    const withProfiles = await Promise.all(sorted.map(async ([uid, total]) => {
      const { data: p } = await supabase.from('profiles').select('company_name, plan').eq('id', uid).single()
      return { name: p?.company_name ?? uid.slice(0, 8), plan: p?.plan, total }
    }))
    setTopUsers(withProfiles)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Analitik Pendapatan</h1>
        <p className="page-subtitle">Prestasi kewangan WorkTrace</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jumlah Pendapatan" value={`RM ${stats.revenue.toLocaleString()}`} icon={<DollarSign size={17} className="text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard label="MRR" value={`RM ${stats.mrr.toLocaleString()}`} icon={<TrendingUp size={17} className="text-green-600" />} iconBg="bg-green-100" />
        <StatCard label="Pengguna Berbayar" value={stats.newPaid} icon={<Users size={17} className="text-purple-600" />} iconBg="bg-purple-100" />
        <StatCard label="ARR (Est.)" value={`RM ${(stats.mrr * 12).toLocaleString()}`} icon={<TrendingDown size={17} className="text-amber-600" />} iconBg="bg-amber-100" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Pendapatan Bulanan (RM)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }} formatter={(v: any) => [`RM ${Number(v).toLocaleString()}`, 'Pendapatan']} />
              <Area type="monotone" dataKey="Pendapatan" stroke="#2563EB" fill="#EFF6FF" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Agihan Pelan</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                {planDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200"><h3 className="text-sm font-semibold text-slate-800">Pengguna Teratas (Invois Dibayar)</h3></div>
        <table className="table">
          <thead><tr><th>#</th><th>Pengguna</th><th>Pelan</th><th>Jumlah Pendapatan</th></tr></thead>
          <tbody>
            {topUsers.map((u, i) => (
              <tr key={i}>
                <td className="text-slate-400 font-mono text-sm">{i + 1}</td>
                <td className="font-medium text-slate-800">{u.name}</td>
                <td><span className="badge badge-blue capitalize">{u.plan}</span></td>
                <td className="font-semibold text-green-700">RM {u.total.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Referrals Page ───────────────────────────
export function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([])
  const [topReferrers, setTopReferrers] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, rewarded: 0, pending: 0, monthsGiven: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data } = await supabase.from('referrals').select('*').order('created_at', { ascending: false })
    setReferrals(data ?? [])
    setStats({
      total: data?.length ?? 0,
      rewarded: data?.filter((r: any) => r.status === 'rewarded').length ?? 0,
      pending: data?.filter((r: any) => r.status === 'pending').length ?? 0,
      monthsGiven: data?.filter((r: any) => r.status === 'rewarded').length ?? 0,
    })
    const { data: profiles } = await supabase.from('profiles').select('id, company_name, referral_count, free_months_earned, free_months_used').gt('referral_count', 0).order('referral_count', { ascending: false }).limit(10)
    setTopReferrers(profiles ?? [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="page-header"><h1 className="page-title">Program Rujukan</h1><p className="page-subtitle">Jejak rujukan dan ganjaran pengguna</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jumlah Rujukan" value={stats.total} icon={<Users size={17} className="text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard label="Berjaya" value={stats.rewarded} icon={<TrendingUp size={17} className="text-green-600" />} iconBg="bg-green-100" />
        <StatCard label="Menunggu" value={stats.pending} icon={<TrendingDown size={17} className="text-amber-600" />} iconBg="bg-amber-100" />
        <StatCard label="Bulan Percuma Diberikan" value={stats.monthsGiven} icon={<DollarSign size={17} className="text-purple-600" />} iconBg="bg-purple-100" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200"><h3 className="text-sm font-semibold text-slate-800">Perujuk Teratas</h3></div>
          <table className="table">
            <thead><tr><th>Pengguna</th><th>Rujukan</th><th>Bulan Diperolehi</th><th>Baki</th></tr></thead>
            <tbody>
              {topReferrers.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-slate-400">Tiada data</td></tr>
                : topReferrers.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium text-slate-800">{r.company_name ?? '—'}</td>
                    <td>{r.referral_count ?? 0}</td>
                    <td>{r.free_months_earned ?? 0}</td>
                    <td className="text-green-700 font-medium">{(r.free_months_earned ?? 0) - (r.free_months_used ?? 0)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200"><h3 className="text-sm font-semibold text-slate-800">Semua Rujukan</h3></div>
          <div className="overflow-y-auto max-h-80">
            <table className="table">
              <thead><tr><th>Kod</th><th>Status</th><th>Tarikh</th></tr></thead>
              <tbody>
                {referrals.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-slate-400">Tiada rujukan</td></tr>
                  : referrals.map(r => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{r.referral_code}</td>
                      <td><span className={`badge ${r.status === 'rewarded' ? 'badge-green' : 'badge-amber'}`}>{r.status === 'rewarded' ? 'Berjaya' : 'Menunggu'}</span></td>
                      <td className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('ms-MY')}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Subscriptions Page ───────────────────────
export function SubscriptionsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [stats, setStats] = useState({ active: 0, mrr: 0, arr: 0, churned: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [proC, teamC, churnC, eventsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro').eq('subscription_status', 'active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'team').eq('subscription_status', 'active'),
      supabase.from('subscription_events').select('*', { count: 'exact', head: true }).eq('event_type', 'cancelled'),
      supabase.from('subscription_events').select('*, profiles(company_name)').order('created_at', { ascending: false }).limit(50),
    ])
    const mrr = ((proC.count ?? 0) * 49) + ((teamC.count ?? 0) * 99)
    setStats({ active: (proC.count ?? 0) + (teamC.count ?? 0), mrr, arr: mrr * 12, churned: churnC.count ?? 0 })
    setEvents(eventsRes.data ?? [])
    setLoading(false)
  }

  const eventColors: Record<string, string> = { subscribed: 'badge-green', cancelled: 'badge-red', expired: 'badge-amber', upgraded: 'badge-blue', reactivated: 'badge-green' }

  return (
    <div className="space-y-6">
      <div className="page-header"><h1 className="page-title">Langganan</h1><p className="page-subtitle">Rekod dan analitik langganan</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Langganan Aktif" value={stats.active} icon={<TrendingUp size={17} className="text-green-600" />} iconBg="bg-green-100" />
        <StatCard label="MRR" value={`RM ${stats.mrr.toLocaleString()}`} icon={<DollarSign size={17} className="text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard label="ARR (Est.)" value={`RM ${stats.arr.toLocaleString()}`} icon={<TrendingUp size={17} className="text-purple-600" />} iconBg="bg-purple-100" />
        <StatCard label="Pembatalan" value={stats.churned} icon={<TrendingDown size={17} className="text-red-500" />} iconBg="bg-red-100" />
      </div>
      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-slate-200"><h3 className="text-sm font-semibold text-slate-800">Rekod Langganan Terkini</h3></div>
        <table className="table">
          <thead><tr><th>Pengguna</th><th>Jenis</th><th>Pelan</th><th>Tempoh</th><th>Jumlah</th><th>Tarikh</th></tr></thead>
          <tbody>
            {events.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tiada rekod</td></tr>
              : events.map(e => (
                <tr key={e.id}>
                  <td className="font-medium text-slate-800">{(e.profiles as any)?.company_name ?? e.user_id?.slice(0, 8)}</td>
                  <td><span className={`badge ${eventColors[e.event_type] ?? 'badge-gray'}`}>{e.event_type}</span></td>
                  <td className="capitalize">{e.plan ?? '—'}</td>
                  <td className="capitalize">{e.billing_period ?? '—'}</td>
                  <td className="font-semibold">{e.amount ? `RM ${e.amount}` : '—'}</td>
                  <td className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString('ms-MY')}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
