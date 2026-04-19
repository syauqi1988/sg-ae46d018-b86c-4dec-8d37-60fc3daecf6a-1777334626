import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

// ─── Stat Card ───────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  iconBg?: string
  trend?: { value: number; label: string }
  subtext?: string
}

export function StatCard({ label, value, icon, iconBg = 'bg-blue-100', trend, subtext }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`${iconBg} p-2.5 rounded-xl`}>{icon}</div>
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          {trend.value >= 0
            ? <TrendingUp size={13} className="text-green-600" />
            : <TrendingDown size={13} className="text-red-500" />
          }
          <span className={`text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}
          </span>
          <span className="text-xs text-slate-400">{trend.label}</span>
        </div>
      )}
      {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
    </div>
  )
}

// ─── Badge ───────────────────────────────────
interface BadgeProps {
  children: ReactNode
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple'
}

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  const variants = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-slate-100 text-slate-600',
    purple: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

// ─── Plan Badge ──────────────────────────────
export function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'pro') return <Badge variant="green">Pro</Badge>
  if (plan === 'team') return <Badge variant="blue">Team</Badge>
  return <Badge variant="gray">Free</Badge>
}

// ─── Priority Badge ──────────────────────────
export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
    urgent: 'red', high: 'amber', normal: 'blue', low: 'gray'
  }
  const labels: Record<string, string> = {
    urgent: 'Urgent', high: 'Tinggi', normal: 'Normal', low: 'Rendah'
  }
  return <Badge variant={map[priority] ?? 'gray'}>{labels[priority] ?? priority}</Badge>
}

// ─── Status Badge ────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'blue' | 'amber' | 'green' | 'gray' | 'red'> = {
    open: 'blue', in_progress: 'amber', resolved: 'green', closed: 'gray',
    active: 'green', expired: 'red', cancelled: 'amber',
  }
  const labels: Record<string, string> = {
    open: 'Terbuka', in_progress: 'Dalam Proses',
    resolved: 'Selesai', closed: 'Ditutup',
    active: 'Aktif', expired: 'Tamat', cancelled: 'Dibatalkan',
  }
  return <Badge variant={map[status] ?? 'gray'}>{labels[status] ?? status}</Badge>
}

// ─── Avatar ──────────────────────────────────
export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-teal-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}

// ─── Empty State ──────────────────────────────
export function EmptyState({ icon, title, desc }: { icon: ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-300 mb-3">{icon}</div>
      <p className="text-slate-600 font-medium">{title}</p>
      {desc && <p className="text-slate-400 text-sm mt-1">{desc}</p>}
    </div>
  )
}

// ─── Modal ───────────────────────────────────
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────
interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-600">
      <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} daripada {total}</span>
      <div className="flex gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
        >←</button>
        <span className="px-3 py-1.5">{page} / {totalPages}</span>
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
        >→</button>
      </div>
    </div>
  )
}

// ─── Search Input ─────────────────────────────
export function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Cari...'}
        className="input pl-9"
      />
    </div>
  )
}
