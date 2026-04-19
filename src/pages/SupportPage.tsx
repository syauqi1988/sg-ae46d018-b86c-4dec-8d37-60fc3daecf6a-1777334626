import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { SearchInput, PriorityBadge, StatusBadge, Pagination, Skeleton, StatCard } from '@/components/ui'
import { LifeBuoy, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ms } from 'date-fns/locale'

const PAGE_SIZE = 25

export default function SupportPage() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 })

  useEffect(() => { fetchTickets() }, [page, statusFilter, priorityFilter])
  useEffect(() => { const t = setTimeout(() => { setPage(1); fetchTickets() }, 350); return () => clearTimeout(t) }, [search])
  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const [all, open, inProg, resolved] = await Promise.all([
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    ])
    setStats({ total: all.count ?? 0, open: open.count ?? 0, inProgress: inProg.count ?? 0, resolved: resolved.count ?? 0 })
  }

  const fetchTickets = async () => {
    setLoading(true)
    let q = supabase.from('support_tickets')
      .select('*', { count: 'exact' })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    if (priorityFilter !== 'all') q = q.eq('priority', priorityFilter)
    if (search) q = q.or(`ticket_number.ilike.%${search}%,subject.ilike.%${search}%,user_name.ilike.%${search}%`)
    const { data, count } = await q.order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    setTickets(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Tiket Sokongan</h1>
        <p className="page-subtitle">Urus dan balas tiket pengguna</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jumlah Tiket" value={stats.total}
          icon={<LifeBuoy size={17} className="text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard label="Terbuka" value={stats.open}
          icon={<LifeBuoy size={17} className="text-amber-600" />} iconBg="bg-amber-100" />
        <StatCard label="Dalam Proses" value={stats.inProgress}
          icon={<Clock size={17} className="text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard label="Diselesaikan" value={stats.resolved}
          icon={<CheckCircle size={17} className="text-green-600" />} iconBg="bg-green-100" />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nombor tiket, subjek..." />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="all">Semua Status</option>
          <option value="open">Terbuka</option>
          <option value="in_progress">Dalam Proses</option>
          <option value="resolved">Selesai</option>
          <option value="closed">Ditutup</option>
        </select>
        <select className="input w-auto" value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}>
          <option value="all">Semua Keutamaan</option>
          <option value="urgent">Urgent</option>
          <option value="high">Tinggi</option>
          <option value="normal">Normal</option>
          <option value="low">Rendah</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="p-4 space-y-3">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tiket</th>
                    <th>Pengguna</th>
                    <th>Kategori</th>
                    <th>Keutamaan</th>
                    <th>Status</th>
                    <th>Dihantar</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                      {stats.total === 0 ? '🎉 Tiada tiket sokongan' : 'Tiada tiket dijumpai'}
                    </td></tr>
                  ) : tickets.map(t => (
                    <tr key={t.id} className="cursor-pointer" onClick={() => navigate(`/support/${t.id}`)}>
                      <td>
                        <p className="font-semibold text-blue-600 text-sm">{t.ticket_number}</p>
                        <p className="text-slate-600 text-xs truncate max-w-[220px]">{t.subject}</p>
                      </td>
                      <td>
                        <p className="text-sm font-medium text-slate-800">{t.user_name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{t.user_email}</p>
                      </td>
                      <td className="text-sm text-slate-600">{t.category}</td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="text-xs text-slate-400 whitespace-nowrap">
                        <p>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ms })}</p>
                        <p>{format(new Date(t.created_at), 'dd MMM yy')}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
