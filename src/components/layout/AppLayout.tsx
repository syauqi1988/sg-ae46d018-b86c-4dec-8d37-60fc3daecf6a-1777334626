import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import Header from './Header'
import { supabase } from '@/lib/supabase'

export default function AppLayout() {
  const { user, adminUser, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openTickets, setOpenTickets] = useState(0)

  useEffect(() => {
    if (!adminUser) return
    fetchOpenTickets()
    const channel = supabase
      .channel('tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchOpenTickets)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [adminUser])

  const fetchOpenTickets = async () => {
    const { count } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
    setOpenTickets(count ?? 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Memuatkan...</p>
        </div>
      </div>
    )
  }

  if (!user || !adminUser) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} ticketCount={openTickets} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} ticketCount={openTickets} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
