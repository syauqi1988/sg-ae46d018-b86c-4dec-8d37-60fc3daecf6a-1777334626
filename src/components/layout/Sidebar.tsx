import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Crown, CreditCard, LifeBuoy,
  TrendingUp, Gift, Tag, Megaphone, Activity, Shield, LogOut, X,
  DollarSign, Trash2
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Pengguna' },
  { to: '/pro-users', icon: Crown, label: 'Pro Pengguna' },
  { to: '/subscriptions', icon: CreditCard, label: 'Langganan' },
  { to: '/pricing', icon: DollarSign, label: 'Harga & Pelan' },
  { to: '/support', icon: LifeBuoy, label: 'Tiket Sokongan', badge: true },
  { to: '/deletions', icon: Trash2, label: 'Permintaan Padam', deletionBadge: true },
  { to: '/analytics', icon: TrendingUp, label: 'Analitik Pendapatan' },
  { to: '/referrals', icon: Gift, label: 'Rujukan' },
  { to: '/discounts', icon: Tag, label: 'Kod Diskaun' },
  { to: '/announcements', icon: Megaphone, label: 'Pengumuman' },
  { to: '/health', icon: Activity, label: 'Semakan Sistem' },
  { to: '/admin-management', icon: Shield, label: 'Pengurusan Admin' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  ticketCount: number
  deletionCount?: number
}

export default function Sidebar({ open, onClose, ticketCount, deletionCount = 0 }: SidebarProps) {
  const { signOut, adminUser } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-56 bg-navy z-30 flex flex-col
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/10">
          <div>
            <span className="text-white font-semibold text-sm">WorkTrace</span>
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">ADMIN</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Admin info */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
              {adminUser?.name?.charAt(0) ?? 'A'}
            </div>
            <div>
              <p className="text-white text-xs font-medium truncate">{adminUser?.name ?? 'Admin'}</p>
              <p className="text-white/40 text-[10px] capitalize">{adminUser?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors
                ${isActive
                  ? 'bg-white text-navy font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <item.icon size={15} />
              <span className="flex-1">{item.label}</span>
              {item.badge && ticketCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                  {ticketCount > 9 ? '9+' : ticketCount}
                </span>
              )}
              {(item as any).deletionBadge && deletionCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                  {deletionCount > 9 ? '9+' : deletionCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full"
          >
            <LogOut size={15} />
            Log Keluar
          </button>
        </div>
      </aside>
    </>
  )
}