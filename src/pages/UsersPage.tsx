import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, MoreHorizontal, UserCheck, UserX, Trash2 } from 'lucide-react'
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
  const [deletionStatusFilter, setDeletionStatusFilter] = useState('all')
  const [actionUser, setActionUser] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<{ type: string; user: any } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchUsers() }, [page, planFilter, statusFilter, deletionStatusFilter])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers() }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('profiles')
      .select(`id, email, phone, plan, subscription_status,
        subscription_end_date, subscription_cancelled, referral_count,
        free_months_earned, lhdn_enabled, created_at, account_deletion_requests(status)`, { count: 'exact' })

    if (planFilter !== 'all') q = q.eq('plan', planFilter)
    if (statusFilter === 'active') q = q.eq('subscription_status', 'active')
    if (statusFilter === 'expired') q = q.eq('subscription_status', 'expired')
    if (statusFilter === 'cancelled') q = q.eq('subscription_cancelled', true)
    if (search) q = q.ilike('email', `%${search}%`)

    const { data, count } = await q
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    // Filter by deletion status if needed
    let filteredData = data ?? []
    if (deletionStatusFilter !== 'all') {
      filteredData = filteredData.filter(user => {
        const delReq = user.account_deletion_requests?.[0]
        if (!delReq) return false
        if (deletionStatusFilter === 'force_delete') return delReq.status === 'force_deleted'
        if (deletionStatusFilter === 'cancelled') return delReq.status === 'cancelled'
        if (deletionStatusFilter === 'completed') return delReq.status === 'completed'
        return false
      })
    }

    setUsers(filteredData)
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, planFilter, statusFilter, deletionStatusFilter, search])

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
    if (type === 'delete') {
      await handleDeleteUser(userId)
      setActionLoading(false)
      return
    }
    await supabase.from('profiles').update(updates).eq('id', userId)
    showToast(type === 'upgrade' ? 'Pengguna dinaik taraf ke Pro' : type === 'downgrade' ? 'Pengguna diturunkan ke Free' : 'Langganan dilanjutkan 1 bulan')
    setConfirmModal(null)
    setActionUser(null)
    fetchUsers()
    setActionLoading(false)
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const user = confirmModal?.user
      // Get all user data to delete cascading records
      const [
        jobsRes,
        customersRes,
        quotesRes,
        invoicesRes,
        workOrdersRes,
        reportsRes,
        ticketsRes,
        eventsRes,
        deletionReqRes,
      ] = await Promise.all([
        supabase.from('jobs').select('id').eq('user_id', userId),
        supabase.from('customers').select('id').eq('user_id', userId),
        supabase.from('quotations').select('id').eq('user_id', userId),
        supabase.from('invoices').select('id').eq('user_id', userId),
        supabase.from('work_orders').select('id').eq('user_id', userId),
        supabase.from('completion_reports').select('id').eq('user_id', userId),
        supabase.from('support_tickets').select('id').eq('user_id', userId),
        supabase.from('subscription_events').select('id').eq('user_id', userId),
        supabase.from('account_deletion_requests').select('id').eq('user_id', userId),
      ])

      // Delete in reverse order of foreign key dependency
      if (eventsRes.data?.length) {
        await supabase.from('subscription_events').delete().in('id', eventsRes.data.map(e => e.id))
      }
      if (ticketsRes.data?.length) {
        await supabase.from('support_tickets').delete().in('id', ticketsRes.data.map(t => t.id))
      }
      if (reportsRes.data?.length) {
        await supabase.from('completion_reports').delete().in('id', reportsRes.data.map(r => r.id))
      }
      if (workOrdersRes.data?.length) {
        await supabase.from('work_orders').delete().in('id', workOrdersRes.data.map(w => w.id))
      }
      if (invoicesRes.data?.length) {
        await supabase.from('invoices').delete().in('id', invoicesRes.data.map(i => i.id))
      }
      if (quotesRes.data?.length) {
        await supabase.from('quotations').delete().in('id', quotesRes.data.map(q => q.id))
      }
      if (jobsRes.data?.length) {
        await supabase.from('jobs').delete().in('id', jobsRes.data.map(j => j.id))
      }
      if (customersRes.data?.length) {
        await supabase.from('customers').delete().in('id', customersRes.data.map(c => c.id))
      }
      if (deletionReqRes.data?.length) {
        await supabase.from('account_deletion_requests').delete().in('id', deletionReqRes.data.map(d => d.id))
      }

      // Finally delete the profile
      await supabase.from('profiles').delete().eq('id', userId)

      showToast(`Pengguna ${user?.email} dan semua data berkaitan telah dipadam`)
      setConfirmModal(null)
      setActionUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('Ralat semasa memadamkan pengguna')
    }
  }

  const getUserDeletionStatus = (user: any) => {
    const delReq = user.account_deletion_requests?.[0]
    if (!delReq) return null
    if (delReq.status === 'force_deleted') return { status: 'force_deleted', label: 'Force Delete' }
    if (delReq.status === 'cancelled') return { status: 'cancelled', label: 'Dibatalkan' }
    if (delReq.status === 'completed') return { status: 'completed', label: 'Selesai' }
    return null
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
        <select className="input w-auto" value={deletionStatusFilter} onChange={e => { setDeletionStatusFilter(e.target.value); setPage(1) }}>
          <option value="all">Semua Status Padam</option>
          <option value="force_delete">Force Delete</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="completed">Selesai</option>
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
                                {getUserDeletionStatus(u) && (
                                  <>
                                    <div className="border-t border-slate-100 my-1" />
                                    <button onClick={() => { setConfirmModal({ type: 'delete', user: u }); setActionUser(null) }}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-red-700">
                                      <Trash2 size={14} /> Padam Pengguna
                                    </button>
                                  </>
                                )}
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
          confirmModal?.type === 'downgrade' ? 'Turunkan ke Free' :
          confirmModal?.type === 'extend' ? 'Lanjut Langganan' :
          confirmModal?.type === 'delete' ? 'Padam Pengguna' : ''
        }
      >
        <p className="text-sm text-slate-600 mb-4">
          {confirmModal?.type === 'upgrade' && `Naik taraf ${confirmModal.user?.email} ke pelan Pro?`}
          {confirmModal?.type === 'downgrade' && `Turunkan ${confirmModal.user?.email} ke pelan Free? Mereka akan kehilangan ciri Pro.`}
          {confirmModal?.type === 'extend' && `Lanjutkan langganan ${confirmModal.user?.email} sebanyak 1 bulan?`}
          {confirmModal?.type === 'delete' && (
            <div className="space-y-2">
              <p className="text-red-700 font-medium">⚠️ Tindakan ini tidak dapat dibatalkan!</p>
              <p>Padam pengguna <strong>{confirmModal.user?.email}</strong> dan semua data berkaitan termasuk:</p>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                <li>Kerja dan pelanggan</li>
                <li>Sebut harga dan invois</li>
                <li>Work order dan laporan</li>
                <li>Tiket sokongan dan rekod langganan</li>
              </ul>
            </div>
          )}
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmModal(null)} className="btn-outline">Batal</button>
          <button
            disabled={actionLoading}
            onClick={() => handleAction(confirmModal!.type, confirmModal!.user.id)}
            className={confirmModal?.type === 'delete' ? 'btn-danger disabled:opacity-60' : 'btn-primary disabled:opacity-60'}
          >
            {actionLoading ? 'Memproses...' : 'Sahkan'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
