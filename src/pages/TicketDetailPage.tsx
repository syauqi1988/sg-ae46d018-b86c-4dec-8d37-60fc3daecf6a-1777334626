import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PriorityBadge, StatusBadge, Skeleton } from '@/components/ui'
import { format } from 'date-fns'

const TEMPLATES = [
  { label: 'Terima kasih', text: 'Terima kasih kerana menghubungi WorkTrace Support. Kami sedang menyemak isu anda dan akan kembali kepada anda tidak lama lagi.' },
  { label: 'Dalam semakan', text: 'Kami sedang menyemak isu yang anda laporkan. Mohon bersabar, kami akan memberikan kemas kini dalam masa 24 jam.' },
  { label: 'Isu diselesaikan', text: 'Kami gembira memaklumkan bahawa isu anda telah berjaya diselesaikan. Sila cuba semula dan maklumkan kepada kami jika masalah masih berterusan.' },
  { label: 'Perlukan info lanjut', text: 'Untuk membantu anda dengan lebih baik, boleh anda kongsikan maklumat tambahan berikut: tangkapan skrin masalah, langkah-langkah yang anda lakukan sebelum masalah berlaku, dan mesej ralat yang dipaparkan.' },
]

export default function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [ticket, setTicket] = useState<any>(null)
  const [replies, setReplies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [toast, setToast] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => { if (id) fetchAll() }, [id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [replies])

  const fetchAll = async () => {
    setLoading(true)
    const [ticketRes, repliesRes] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', id!).single(),
      supabase.from('ticket_replies').select('*').eq('ticket_id', id!).order('created_at'),
    ])
    setTicket(ticketRes.data)
    setAdminNotes(ticketRes.data?.admin_notes ?? '')
    setReplies(repliesRes.data ?? [])
    setLoading(false)
  }

  const sendReply = async () => {
    if (!reply.trim() || !id) return
    setSending(true)
    await supabase.from('ticket_replies').insert({ ticket_id: id, sender_type: 'admin', message: reply.trim() })
    await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', id)
    setReply('')
    fetchAll()
    showToast('Balasan dihantar!')
    setSending(false)
  }

  const updateStatus = async (status: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() }
    if (status === 'resolved') updates.resolved_at = new Date().toISOString()
    await supabase.from('support_tickets').update(updates).eq('id', id!)
    fetchAll()
    showToast('Status dikemaskini')
  }

  const saveAdminNotes = async () => {
    await supabase.from('support_tickets').update({ admin_notes: adminNotes }).eq('id', id!)
    showToast('Nota disimpan')
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>
  if (!ticket) return <div className="text-center py-20 text-slate-400">Tiket tidak dijumpai.</div>

  return (
    <div className="space-y-5 max-w-5xl">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>
      )}

      <button onClick={() => navigate('/support')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Kembali ke Tiket
      </button>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main thread */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-blue-600">{ticket.ticket_number}</span>
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
                <h2 className="text-base font-semibold text-slate-900">{ticket.subject}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{ticket.category} · {format(new Date(ticket.created_at), 'dd MMM yyyy, hh:mm a')}</p>
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div className="card p-5 space-y-4 max-h-[480px] overflow-y-auto">
            {/* Original message */}
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                {(ticket.user_name ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700">{ticket.user_name ?? ticket.user_email}</span>
                  <span className="text-[10px] text-slate-400">{format(new Date(ticket.created_at), 'dd MMM, hh:mm a')}</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl rounded-tl-none p-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>
            </div>

            {/* Replies */}
            {replies.map(r => (
              <div key={r.id} className={`flex gap-3 ${r.sender_type === 'admin' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${r.sender_type === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {r.sender_type === 'admin' ? 'A' : (ticket.user_name ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div className={`flex-1 ${r.sender_type === 'admin' ? 'items-end' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${r.sender_type === 'admin' ? 'justify-end' : ''}`}>
                    <span className="text-xs font-semibold text-slate-700">{r.sender_type === 'admin' ? 'WorkTrace Support' : ticket.user_name}</span>
                    <span className="text-[10px] text-slate-400">{format(new Date(r.created_at), 'dd MMM, hh:mm a')}</span>
                  </div>
                  <div className={`rounded-xl p-3 text-sm whitespace-pre-wrap ${r.sender_type === 'admin' ? 'bg-green-50 border border-green-100 rounded-tr-none text-slate-700' : 'bg-blue-50 border border-blue-100 rounded-tl-none text-slate-700'}`}>
                    {r.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply Box */}
          {ticket.status !== 'closed' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Hantar Balasan</p>
                <div className="relative">
                  <button onClick={() => setShowTemplates(!showTemplates)} className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg">
                    📋 Template
                  </button>
                  {showTemplates && (
                    <div className="absolute right-0 bottom-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 w-64 py-1">
                      {TEMPLATES.map(t => (
                        <button key={t.label} onClick={() => { setReply(t.text); setShowTemplates(false) }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700">
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Taip balasan anda di sini..."
                rows={4}
                className="input resize-none"
              />
              <div className="flex justify-end">
                <button onClick={sendReply} disabled={!reply.trim() || sending}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  <Send size={14} />
                  {sending ? 'Menghantar...' : 'Hantar Balasan'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* User Info */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Maklumat Pengguna</h3>
            <div className="space-y-2 text-sm">
              <div><p className="text-slate-400 text-xs">Nama</p><p className="font-medium">{ticket.user_name ?? '—'}</p></div>
              <div><p className="text-slate-400 text-xs">Emel</p><p className="font-medium text-blue-600">{ticket.user_email}</p></div>
              <div><p className="text-slate-400 text-xs">Pelan</p><p className="font-medium capitalize">{ticket.user_plan ?? 'free'}</p></div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Kemaskini Status</h3>
            <div className="space-y-2">
              {[
                { status: 'open', label: 'Buka Semula', color: 'text-blue-700 bg-blue-50 hover:bg-blue-100' },
                { status: 'in_progress', label: 'Dalam Proses', color: 'text-amber-700 bg-amber-50 hover:bg-amber-100' },
                { status: 'resolved', label: 'Tandakan Selesai', color: 'text-green-700 bg-green-50 hover:bg-green-100' },
                { status: 'closed', label: 'Tutup Tiket', color: 'text-slate-600 bg-slate-100 hover:bg-slate-200' },
              ].map(s => (
                <button key={s.status} disabled={ticket.status === s.status} onClick={() => updateStatus(s.status)}
                  className={`w-full py-2 px-3 text-sm rounded-lg text-left disabled:opacity-40 ${s.color}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Nota Dalaman</h3>
            <p className="text-xs text-slate-400">Tidak ditunjukkan kepada pengguna</p>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
              placeholder="Tambah nota dalaman..." rows={3} className="input resize-none text-xs" />
            <button onClick={saveAdminNotes} className="btn-outline w-full text-sm">Simpan Nota</button>
          </div>
        </div>
      </div>
    </div>
  )
}
