import { Menu, Bell, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface HeaderProps {
  onMenuClick: () => void
  ticketCount: number
}

export default function Header({ onMenuClick, ticketCount }: HeaderProps) {
  const { adminUser } = useAuth()

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <Menu size={18} />
        </button>
        <div className="hidden lg:block">
          <h1 className="text-sm font-medium text-slate-900">WorkTrace Admin Panel</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={import.meta.env.VITE_APP_URL ?? 'https://app.worktrace.my'}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ExternalLink size={12} />
          Buka Aplikasi
        </a>

        <div className="relative">
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative">
            <Bell size={17} />
            {ticketCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {ticketCount > 9 ? '9+' : ticketCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
            {adminUser?.name?.charAt(0) ?? 'A'}
          </div>
          <span className="hidden sm:block text-sm font-medium text-slate-700">
            {adminUser?.name ?? 'Admin'}
          </span>
        </div>
      </div>
    </header>
  )
}
