import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Badge, SearchInput, Pagination, Skeleton, StatCard } from '@/components/ui'
import { ClipboardList, CheckCircle, Clock, XCircle, FileText } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ms } from 'date-fns/locale'

const PAGE_SIZE = 25

const STATUS_TABS = ['Semua', 'Draft', 'Sent', 'Accepted', 'Rejected']

export default function WorkOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Semua')
  const [stats, setStats] = useState({ total: 0, sent: 0, accepted: 0, rejected: 0 })

  useEffect(() => { fetchStats() }, [])
  useEffect(() => { fetchOrders() }, [page, activeTab])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchOrders() }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchStats = async () => {
    const [all, sent, accepted, rejected] = await Promise.all([
      supabase.from('work_orders').select('*', { count: 'exact', head: true }),
      supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'Sent'),
      supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'Accepted'),
      supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
    ])
    setStats({
      total: all.count ?? 0,
      sent: sent.count ?? 0,
      accepted: accepted.count ?? 0,
      rejected: rejected.count ?? 0,
    })
  }

  const fetchOrders = async () => {
    setLoading(true)
    let q = supabase
      .from('work_orders')
      .select(`
        id, wo_number, title, status, total,
        scheduled_start_date, created_at,
        jobs(title, customers(name)),
        profiles(company_name)
      `, { count: 'exact' })

    if (activeTab !== 'Semua') q = q.eq('status', activeTab)
    if (search) q = q.or(`wo_number.ilike.%${search}%,title.ilike.%${search}%`)

    const { data, count } = await q
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    setOrders(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, 'blue' | 'amber' | 'green' | 'red' | 'gray'> = {
      Draft: 'gray', Sent: 'blue', Accepted: 'green', Rejected: 'red'
    }
    const labels: Record<string, string> = {
      Draft: 'Draf', Sent: 'Dihantar', Accepted: 'Diterima', Rejected: 'Ditolak'
    }
    return <Badge variant={map[status] ?? 'gray'}>{labels[status] ?? status}</Badge>
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ClipboardList size={20} className="text-blue-600" />
          Work Order
        </h1>
        <p className="page-subtitle">Semua work order merentasi pengguna</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jumlah WO" value={stats.total}
          icon={<ClipboardList size={17} className="text-blue-600" />} iconBg="bg-blue-100" />
        <StatCard label="Dihantar" value={stats.sent}
          icon={<Clock size={17} className="text-amber-600" />} iconBg="bg-amber-100" />
        <StatCard label="Diterima" value={stats.accepted}
          icon={<CheckCircle size={17} className="text-green-600" />} iconBg="bg-green-100" />
        <StatCard label="Ditolak" value={stats.rejected}
          icon={<XCircle size={17} className="text-red-500" />} iconBg="bg-red-100" />
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nombor WO atau tajuk..." />
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>No. WO</th>
                    <th>Tajuk / Kerja</th>
                    <th>Pengguna</th>
                    <th>Status</th>
                    <th>Tarikh Mula</th>
                    <th>Jumlah</th>
                    <th>Dicipta</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                        <p>Tiada work order dijumpai</p>
                      </td>
                    </tr>
                  ) : orders.map((wo: any) => (
                    <tr key={wo.id} className="cursor-pointer"
                      onClick={() => navigate(`/work-orders/${wo.id}`)}>
                      <td>
                        <span className="font-semibold text-blue-600 text-sm">{wo.wo_number}</span>
                      </td>
                      <td>
                        <p className="font-medium text-slate-800 text-sm">{wo.title}</p>
                        <p className="text-xs text-slate-400">
                          {wo.jobs?.customers?.name ?? '—'}
                        </p>
                      </td>
                      <td className="text-sm text-slate-600">
                        {wo.profiles?.company_name ?? '—'}
                      </td>
                      <td>{statusBadge(wo.status)}</td>
                      <td className="text-sm text-slate-500">
                        {wo.scheduled_start_date
                          ? format(new Date(wo.scheduled_start_date), 'dd MMM yyyy')
                          : '—'}
                      </td>
                      <td className="font-semibold text-slate-800 text-sm">
                        {wo.total ? `RM ${Number(wo.total).toLocaleString('ms-MY', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true, locale: ms })}
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