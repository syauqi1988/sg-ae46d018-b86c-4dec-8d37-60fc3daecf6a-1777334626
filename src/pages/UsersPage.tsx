import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, MoreHorizontal, UserCheck, UserX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar, Badge, PlanBadge, SearchInput, Pagination, Skeleton, Modal } from '@/components/ui'
import { format } from 'date-fns'

const PAGE_SIZE = 25

export default function UsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionUser, setActionUser] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<{ type: string; user: any } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchUsers() }, [page, planFilter, statusFilter])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers() }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('profiles')
      .select(`id, email, phone, plan, subscription_status,
        subscription_end_date, subscription_cancelled, referral_count,
        free_months_earned, lhdn_enabled, created_at`, { count: 'exact' })

    if (planFilter !== 'all') q = q.eq('plan', planFilter)
    if (statusFilter === 'active') q = q.eq('subscription_status', 'active')
    if (statusFilter === 'expired') q = q.eq('subscription_status', 'expired')
    if (statusFilter === 'cancelled') q = q.eq('subscription_cancelled', true)
    if (search) q = q.ilike('email', `%${search}%`)

    const { data, count } = await q
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    setUsers(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, planFilter, statusFilter, search])

  const exportCSV = () => {
    const headers = ['ID', 'Emel', 'Pelan', 'Status', 'Tarikh Daftar']
    const rows = users.map(u => [u.id, u.email ?? '', u.plan, u.subscription_status ?? '', u.created_at])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `worktrace-users-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleAction = async (type: string, userId: string) => {
    setActionLoading(true)
    const updates: any = {}
    if (type === 'upgrade') { updates.plan = 'pro'; updates.subscription_status = 'active' }
    if (type === 'downgrade') { updates.plan = 'free'; updates.subscription_status = null }
    if (type === 'extend') {
      const end = new Date(); end.setMonth(end.getMonth() + 1)
      updates.subscription_end_date = end.toISOString()
    }
    await supabase.from('profiles').update(updates).eq('id', userId)
    showToast(type === 'upgrade' ? 'Pengguna dinaik taraf ke Pro' : type === 'downgrade' ? 'Pengguna diturunkan ke Free' : 'Langganan dilanjutkan 1 bulan')
    setConfirmModal(null)
    setActionUser(null)
    fetchUsers()
    setActionLoading(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Pengurusan Pengguna</h1>
          <p className="page-subtitle">Urus pengguna dan kebenaran mereka</p>
        </div>
        <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari emel pengguna..." />
        </div>
        <select className="input w-auto" value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1) }}>
          <option value="all">Semua Pelan</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
        </select>
        <select className="input w-auto" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="expired">Tamat</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="p-4 space-y-3">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Pelan</th>
                    <th>Status</th>
                    <th>Rujukan</th>
                    <th>Tarikh Daftar</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tiada pengguna dijumpai</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.email ?? 'U'} size="sm" />
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{u.email ?? '—'}</p>
                            <p className="text-slate-400 text-xs">{u.phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td><PlanBadge plan={u.plan} /></td>
                      <td>
                        {u.plan === 'free'
                          ? <Badge variant="gray">Free</Badge>
                          : u.subscription_cancelled
                            ? <Badge variant="amber">Akan Tamat</Badge>
                            : u.subscription_status === 'active'
                              ? <Badge variant="green">Aktif</Badge>
                              : <Badge variant="red">Tamat</Badge>
                        }
                      </td>
                      <td className="text-slate-600 text-sm">{u.referral_count ?? 0} rujukan</td>
                      <td className="text-slate-500 text-sm">{format(new Date(u.created_at), 'dd MMM yyyy')}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/users/${u.id}`)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          >
                            <Eye size={14} />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActionUser(actionUser?.id === u.id ? null : u)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {actionUser?.id === u.id && (
                              <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 w-48 py-1" onClick={e => e.stopPropagation()}>
                                <button onClick={() => { setConfirmModal({ type: 'upgrade', user: u }); setActionUser(null) }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-green-700">
                                  <UserCheck size={14} /> Naik Taraf ke Pro
                                </button>
                                <button onClick={() => { setConfirmModal({ type: 'downgrade', user: u }); setActionUser(null) }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-amber-700">
                                  <UserX size={14} /> Turunkan ke Free
                                </button>
                                <button onClick={() => { setConfirmModal({ type: 'extend', user: u }); setActionUser(null) }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-blue-700">
                                  + Lanjut 1 Bulan
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button onClick={() => { navigate(`/users/${u.id}`); setActionUser(null) }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-600">
                                  Lihat Profil
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
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

      {/* Confirm Modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={
          confirmModal?.type === 'upgrade' ? 'Naik Taraf ke Pro' :
          confirmModal?.type === 'downgrade' ? 'Turunkan ke Free' : 'Lanjut Langganan'
        }
      >
        <p className="text-sm text-slate-600 mb-4">
          {confirmModal?.type === 'upgrade' && `Naik taraf ${confirmModal.user?.email} ke pelan Pro?`}
          {confirmModal?.type === 'downgrade' && `Turunkan ${confirmModal.user?.email} ke pelan Free? Mereka akan kehilangan ciri Pro.`}
          {confirmModal?.type === 'extend' && `Lanjutkan langganan ${confirmModal.user?.email} sebanyak 1 bulan?`}
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmModal(null)} className="btn-outline">Batal</button>
          <button
            disabled={actionLoading}
            onClick={() => handleAction(confirmModal!.type, confirmModal!.user.id)}
            className="btn-primary disabled:opacity-60"
          >
            {actionLoading ? 'Memproses...' : 'Sahkan'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
