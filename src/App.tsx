import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/UsersPage'
import UserDetailPage from '@/pages/UserDetailPage'
import SupportPage from '@/pages/SupportPage'
import TicketDetailPage from '@/pages/TicketDetailPage'
import { AnalyticsPage, ReferralsPage, SubscriptionsPage } from '@/pages/AnalyticsReferralsSubscriptions'
import { DiscountsPage, AnnouncementsPage, HealthPage, AdminManagementPage, ProUsersPage } from '@/pages/OtherPages'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="pro-users" element={<ProUsersPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="support/:id" element={<TicketDetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="discounts" element={<DiscountsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="admin-management" element={<AdminManagementPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
