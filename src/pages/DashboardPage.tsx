import { useState, useEffect } from 'react'
import { Users, CreditCard, TrendingUp, AlertTriangle, UserCheck, DollarSign, ExternalLink, LifeBuoy } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { StatCard, Badge, PlanBadge, Avatar, Skeleton } from '@/components/ui'
import { format, subDays, startOfMonth } from 'date-fns'
import { ms } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0, freeUsers: 0, paidUsers: 0,
    trialExhausted: 0, activeSubscriptions: 0,
    monthlyRevenue: 0, newUsersThisWeek: 0, newUsersLastWeek: 0
  })
  const [growthData, setGrowthData] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentTickets, setRecentTickets] = useState<any[]>([])
  const [topLocations] = useState([
    { code: 'MY', flag: '🇲🇾', count: 0 },
    { code: 'SG', flag: '🇸🇬', count: 0 },
    { code: 'ID', flag: '🇮🇩', count: 0 },
  ])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchStats(), fetchGrowth(), fetchRevenue(), fetchRecentUsers(), fetchRecentTickets()])
    setLoading(false)
  }

  const fetchStats = async () => {
    const weekAgo = subDays(new Date(), 7).toISOString()
    const twoWeeksAgo = subDays(new Date(), 14).toISOString()
    const monthStart = startOfMonth(new Date()).toISOString()

    const [total, free, paid, activeSubs, newThis, newLast, revenue] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'free'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).in('plan', ['pro', 'team']),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active').in('plan', ['pro', 'team']),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
      supabase.from('subscription_events').select('amount').eq('event_type', 'subscribed').gte('created_at', monthStart),
    ])

    const totalRevenue = (revenue.data ?? []).reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0)
    setStats({
      totalUsers: total.count ?? 0,
      freeUsers: free.count ?? 0,
      paidUsers: paid.count ?? 0,
      trialExhausted: 0,
      activeSubscriptions: activeSubs.count ?? 0,
      monthlyRevenue: totalRevenue,
      newUsersThisWeek: newThis.count ?? 0,
      newUsersLastWeek: newLast.count ?? 0,
    })
  }

  const fetchGrowth = async () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), 29 - i)
      return format(d, 'dd MMM', { locale: ms })
    })
    setGrowthData(days.map((d, i) => ({
      date: d,
      'Jumlah': Math.floor(Math.random() * 20) + i * 3,
      'Pro': Math.floor(Math.random() * 5) + i,
    })))
  }

  const fetchRevenue = async () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis']
    const { data } = await supabase.from('subscription_events')
      .select('amount, created_at').eq('event_type', 'subscribed')
    const byMonth = months.map((m, i) => {
      const total = (data ?? []).filter((e: any) => new Date(e.created_at).getMonth() === i)
        .reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
      return { bulan: m, Pendapatan: total }
    })
    setRevenueData(byMonth)
  }

  const fetchRecentUsers = async () => {
    const { data } = await supabase.from('profiles')
      .select('id, email, plan, created_at')
      .order('created_at', { ascending: false })
      .limit(8)
    setRecentUsers(data ?? [])
  }

  const fetchRecentTickets = async () => {
    const { data } = await supabase.from('support_tickets')
      .select('*').in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false }).limit(5)
    setRecentTickets(data ?? [])
  }

  const priorityColor: Record<string, string> = {
    urgent: 'text-red-600', high: 'text-amber-600', normal: 'text-blue-600', low: 'text-slate-400'
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Gambaran keseluruhan WorkTrace</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Jumlah Pengguna" value={stats.totalUsers.toLocaleString()}
            icon={<Users size={18} className="text-blue-600" />} iconBg="bg-blue-100"
            trend={{ value: stats.newUsersThisWeek, label: 'minggu ini' }} />
          <StatCard label="Pengguna Free" value={stats.freeUsers.toLocaleString()}
            icon={<UserCheck size={18} className="text-slate-500" />} iconBg="bg-slate-100" />
          <StatCard label="Pengguna Berbayar" value={stats.paidUsers.toLocaleString()}
            icon={<CreditCard size={18} className="text-green-600" />} iconBg="bg-green-100" />
          <StatCard label="Had Hampir Habis" value={stats.trialExhausted.toLocaleString()}
            icon={<AlertTriangle size={18} className="text-amber-600" />} iconBg="bg-amber-100" />
          <StatCard label="Langganan Aktif" value={stats.activeSubscriptions.toLocaleString()}
            icon={<TrendingUp size={18} className="text-green-600" />} iconBg="bg-green-100" />
          <StatCard label="Pendapatan Bulan Ini" value={`RM ${stats.monthlyRevenue.toLocaleString('ms-MY', { minimumFractionDigits: 0 })}`}
            icon={<DollarSign size={18} className="text-blue-600" />} iconBg="bg-blue-100" />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Growth Chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Pertumbuhan Pengguna (30 Hari)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Jumlah" stroke="#2563EB" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Pro" stroke="#16A34A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Pendapatan Bulanan (RM)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}
                formatter={(v: any) => [`RM ${Number(v).toLocaleString()}`, 'Pendapatan']} />
              <Bar dataKey="Pendapatan" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800">Pendaftaran Terkini</h3>
            <button onClick={() => navigate('/users')} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Lihat semua <ExternalLink size={11} />
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <table className="table">
              <thead><tr><th>Pengguna</th><th>Pelan</th><th>Tarikh</th></tr></thead>
              <tbody>
                {recentUsers.map((u: any) => (
                  <tr key={u.id} className="cursor-pointer" onClick={() => navigate(`/users/${u.id}`)}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={u.email ?? 'U'} size="sm" />
                        <span className="font-medium text-slate-800 text-xs">{u.email ?? '—'}</span>
                      </div>
                    </td>
                    <td><PlanBadge plan={u.plan} /></td>
                    <td className="text-slate-400 text-xs">{format(new Date(u.created_at), 'dd MMM yy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Tickets */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <LifeBuoy size={15} className="text-blue-600" />
              Tiket Terbuka
            </h3>
            <button onClick={() => navigate('/support')} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Lihat semua <ExternalLink size={11} />
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : recentTickets.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">🎉 Tiada tiket terbuka</div>
          ) : (
            <table className="table">
              <thead><tr><th>Tiket</th><th>Keutamaan</th><th>Masa</th></tr></thead>
              <tbody>
                {recentTickets.map((t: any) => (
                  <tr key={t.id} className="cursor-pointer" onClick={() => navigate(`/support/${t.id}`)}>
                    <td>
                      <p className="font-medium text-slate-800 text-xs">{t.ticket_number}</p>
                      <p className="text-slate-400 text-xs truncate max-w-[180px]">{t.subject}</p>
                    </td>
                    <td>
                      <span className={`text-xs font-medium ${priorityColor[t.priority]}`}>
                        ● {t.priority}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs whitespace-nowrap">
                      {format(new Date(t.created_at), 'dd MMM')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
