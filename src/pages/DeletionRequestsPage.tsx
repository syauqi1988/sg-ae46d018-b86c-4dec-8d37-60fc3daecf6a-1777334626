import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge, StatCard, Modal, SearchInput, Pagination, Skeleton } from '@/components/ui'
import { Trash2, AlertTriangle, Clock, CheckCircle, XCircle, Shield, RefreshCw } from 'lucide-react'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { ms } from 'date-fns/locale'

const PAGE_SIZE = 20

export default function DeletionRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [stats, setStats] = useState({ total: 0, pending: 0, cancelled: 0, completed: 0 })
  const [actionModal, setActionModal] = useState<{
    type: 'cancel' | 'force'
    request: any
  } | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchStats() }, [])
  useEffect(() => { fetchRequests() }, [page, statusFilter])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchRequests() }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchStats = async () => {
    const [all, pending, cancelled, completed] = await Promise.all([
      supabase.from('account_deletion_requests').select('*', { count: 'exact', head: true }),
      supabase.from('account_deletion_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('account_deletion_requests').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('account_deletion_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ])
    setStats({
      total: all.count ?? 0,
      pending: pending.count ?? 0,
      cancelled: cancelled.count ?? 0,
      completed: completed.count ?? 0,
    })
  }

  const fetchRequests = async () => {
    setLoading(true)
    let q = supabase
      .from('account_deletion_requests')
      .select('*', { count: 'exact' })

    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    if (search) q = q.or(`user_email.ilike.%${search}%,user_name.ilike.%${search}%`)

    const { data, count } = await q
      .order('requested_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    setRequests(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  const handleCancelDeletion = async () => {
    if (!actionModal) return
    setProcessing(true)
    const req = actionModal.request

    await Promise.all([
      supabase.from('account_deletion_requests').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'admin',
        admin_notes: adminNote || null,
      }).eq('id', req.id),
      supabase.from('profiles').update({
        account_status: 'active',
        deletion_requested_at: null,
        deletion_scheduled_at: null,
        deletion_reason: null,
        deletion_cancelled_at: new Date().toISOString(),
      }).eq('id', req.user_id),
    ])

    showToast(`Pemadaman ${req.user_name ?? req.user_email} telah dibatalkan oleh admin`)
    setActionModal(null)
    setAdminNote('')
    fetchRequests()
    fetchStats()
    setProcessing(false)
  }

  const handleForceMark = async () => {
    if (!actionModal) return
    setProcessing(true)
    const req = actionModal.request

    await Promise.all([
      supabase.from('account_deletion_requests').update({
        status: 'force_deleted',
        completed_at: new Date().toISOString(),
        admin_notes: adminNote || 'Force deleted by admin',
      }).eq('id', req.id),
      supabase.from('profiles').update({
        account_status: 'deleted',
      }).eq('id', req.user_id),
    ])

    showToast(`Akaun ${req.user_name ?? req.user_email} ditanda sebagai dipadam`)
    setActionModal(null)
    setAdminNote('')
    fetchRequests()
    fetchStats()
    setProcessing(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const getDaysLeft = (scheduledAt: string) => {
    return differenceInDays(new Date(scheduledAt), new Date())
  }

  const statusBadge = (status: string) => {
    const map: Record<string, 'amber' | 'green' | 'red' | 'gray'> = {
      pending: 'amber',
      cancelled: 'green',
      completed: 'gray',
      force_deleted: 'red',
    }
    const labels: Record<string, string> = {
      pending: 'Menunggu',
      cancelled: 'Dibatalkan',
      completed: 'Selesai',
      force_deleted: 'Force Deleted',
    }
    return <Badge variant={map[status] ?? 'gray'}>{labels[status] ?? status}</Badge>
  }

  const planBadge = (plan: string | null) => {
    if (!plan) return <Badge variant="gray">—</Badge>
    if (plan === 'pro') return <Badge variant="green">Pro</Badge>
    if (plan === 'team') return <Badge variant="blue">Team</Badge>
    return <Badge variant="gray">Free</Badge>
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Trash2 size={20} className="text-red-500" />
          Permintaan Pemadaman Akaun
        </h1>
        <p className="page-subtitle">
          Urus permintaan pemadaman akaun pengguna
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-0.5">Pemadaman automatik berlaku selepas 14 hari</p>
          <p className="text-amber-700">
            Sistem akan memadamkan akaun secara automatik pada tarikh yang dijadualkan
            melalui Edge Function <code className="bg-amber-100 px-1 rounded text-xs">process-deletions</code>.
            Admin boleh membatalkan atau force-delete dari sini.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jumlah Permintaan" value={stats.total}
          icon={<Trash2 size={17} className="text-red-500" />} iconBg="bg-red-100" />
        <StatCard label="Menunggu" value={stats.pending}
          icon={<Clock size={17} className="text-amber-600" />} iconBg="bg-amber-100" />
        <StatCard label="Dibatalkan" value={stats.cancelled}
          icon={<CheckCircle size={17} className="text-green-600" />} iconBg="bg-green-100" />
        <StatCard label="Selesai Dipadam" value={stats.completed}
          icon={<XCircle size={17} className="text-slate-500" />} iconBg="bg-slate-100" />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari emel atau nama pengguna..." />
        </div>
        <select className="input w-auto" value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="completed">Selesai</option>
          <option value="force_deleted">Force Deleted</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Pelan</th>
                    <th>Sebab</th>
                    <th>Status</th>
                    <th>Dijadualkan</th>
                    <th>Baki Hari</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <Trash2 size={32} className="mx-auto mb-2 opacity-30" />
                        <p>Tiada permintaan pemadaman</p>
                      </td>
                    </tr>
                  ) : requests.map(req => {
                    const daysLeft = req.scheduled_at ? getDaysLeft(req.scheduled_at) : null
                    const isUrgent = daysLeft !== null && daysLeft <= 3 && req.status === 'pending'
                    return (
                      <tr key={req.id} className={isUrgent ? 'bg-red-50' : ''}>
                        <td>
                          <p className="font-medium text-slate-800 text-sm">
                            {req.user_name ?? '—'}
                          </p>
                          <p className="text-xs text-slate-400">{req.user_email}</p>
                          <p className="text-xs text-slate-300 font-mono">
                            {req.user_id?.slice(0, 12)}...
                          </p>
                        </td>
                        <td>{planBadge(req.user_plan)}</td>
                        <td>
                          <p className="text-sm text-slate-600 max-w-[200px] truncate" title={req.reason}>
                            {req.reason ?? '—'}
                          </p>
                        </td>
                        <td>{statusBadge(req.status)}</td>
                        <td className="text-sm text-slate-500">
                          {req.scheduled_at
                            ? format(new Date(req.scheduled_at), 'dd MMM yyyy')
                            : '—'}
                          <p className="text-xs text-slate-400">
                            {req.requested_at && formatDistanceToNow(new Date(req.requested_at), {
                              addSuffix: true, locale: ms
                            })}
                          </p>
                        </td>
                        <td>
                          {daysLeft !== null && req.status === 'pending' ? (
                            <span className={`text-sm font-semibold ${
                              daysLeft <= 1 ? 'text-red-600'
                              : daysLeft <= 3 ? 'text-amber-600'
                              : 'text-slate-700'
                            }`}>
                              {daysLeft <= 0 ? 'Hari ini!' : `${daysLeft} hari`}
                            </span>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </td>
                        <td>
                          {req.status === 'pending' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setActionModal({ type: 'cancel', request: req }); setAdminNote('') }}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                              >
                                <RefreshCw size={11} /> Batal Padam
                              </button>
                              <button
                                onClick={() => { setActionModal({ type: 'force', request: req }); setAdminNote('') }}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                              >
                                <Shield size={11} /> Force Delete
                              </button>
                            </div>
                          )}
                          {req.status === 'cancelled' && (
                            <p className="text-xs text-slate-400">
                              Dibatalkan oleh {req.cancelled_by}
                              {req.cancelled_at && (
                                <span className="block">
                                  {format(new Date(req.cancelled_at), 'dd MMM yyyy')}
                                </span>
                              )}
                            </p>
                          )}
                          {(req.status === 'completed' || req.status === 'force_deleted') && (
                            <p className="text-xs text-slate-400">
                              {req.completed_at && format(new Date(req.completed_at), 'dd MMM yyyy')}
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </>
        )}
      </div>

      {/* Cancel Deletion Modal */}
      <Modal
        isOpen={actionModal?.type === 'cancel'}
        onClose={() => setActionModal(null)}
        title="Batalkan Permintaan Pemadaman"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              Akaun <strong>{actionModal?.request?.user_name ?? actionModal?.request?.user_email}</strong> akan
              dipulihkan sepenuhnya. Pengguna boleh log masuk semula.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nota Admin (opsional)
            </label>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Sebab pembatalan oleh admin..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setActionModal(null)} className="btn-outline">Batal</button>
            <button
              onClick={handleCancelDeletion}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center gap-2"
            >
              {processing
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
                : <><RefreshCw size={14} /> Pulihkan Akaun</>
              }
            </button>
          </div>
        </div>
      </Modal>

      {/* Force Delete Modal */}
      <Modal
        isOpen={actionModal?.type === 'force'}
        onClose={() => setActionModal(null)}
        title="Force Delete Akaun"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                Ini akan menanda akaun <strong>{actionModal?.request?.user_name ?? actionModal?.request?.user_email}</strong> sebagai
                dipadam. Edge Function <code className="bg-red-100 px-1 rounded text-xs">process-deletions</code> akan
                memadamkan data sepenuhnya pada run seterusnya.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sebab Force Delete *
            </label>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Penipuan, penyalahgunaan, permintaan undang-undang..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setActionModal(null)} className="btn-outline">Batal</button>
            <button
              onClick={handleForceMark}
              disabled={processing || !adminNote.trim()}
              className="btn-danger disabled:opacity-60 flex items-center gap-2"
            >
              {processing
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
                : <><Shield size={14} /> Tandakan Dipadam</>
              }
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}