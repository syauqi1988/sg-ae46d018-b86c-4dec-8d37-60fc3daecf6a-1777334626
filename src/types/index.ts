export interface AdminUser {
  id: string
  user_id: string
  email: string
  name: string
  role: 'admin' | 'super_admin'
  is_active: boolean
  last_login: string | null
  created_at: string
}

export interface Profile {
  id: string
  company_name: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  plan: 'free' | 'pro' | 'team'
  billing_period: 'monthly' | 'yearly' | null
  subscription_status: 'active' | 'expired' | 'cancelled' | null
  subscription_start_date: string | null
  subscription_end_date: string | null
  subscription_cancelled: boolean
  referral_code: string | null
  referral_count: number
  free_months_earned: number
  free_months_used: number
  tutorial_completed: boolean
  lhdn_enabled: boolean
  created_at: string
  email?: string
}

export interface SupportTicket {
  id: string
  ticket_number: string
  user_id: string
  user_email: string
  user_name: string | null
  user_plan: string | null
  category: string
  subject: string
  description: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  attachments: string[]
  admin_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface TicketReply {
  id: string
  ticket_id: string
  user_id: string | null
  sender_type: 'user' | 'admin'
  message: string
  attachments: string[]
  created_at: string
}

export interface SubscriptionEvent {
  id: string
  user_id: string
  event_type: 'subscribed' | 'cancelled' | 'expired' | 'upgraded' | 'downgraded' | 'reactivated'
  plan: string | null
  billing_period: string | null
  amount: number | null
  notes: string | null
  created_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  referral_code: string
  status: 'pending' | 'rewarded'
  created_at: string
  completed_at: string | null
  rewarded_at: string | null
}

export interface DiscountCode {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_uses: number | null
  current_uses: number
  applicable_plans: string[]
  expires_at: string | null
  is_active: boolean
  description: string | null
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'critical'
  target_plan: 'all' | 'free' | 'pro' | 'team'
  display_type: 'banner' | 'modal' | 'toast'
  is_active: boolean
  starts_at: string
  expires_at: string | null
  created_at: string
}

export interface DashboardStats {
  totalUsers: number
  freeUsers: number
  paidUsers: number
  trialExhausted: number
  activeSubscriptions: number
  monthlyRevenue: number
  newUsersThisWeek: number
  newUsersLastWeek: number
}
