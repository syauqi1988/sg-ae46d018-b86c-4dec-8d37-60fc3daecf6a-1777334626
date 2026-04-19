# WorkTrace Admin Panel

Admin dashboard for WorkTrace — connects to the same Supabase project as the main WorkTrace app.

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/worktrace-admin.git
cd worktrace-admin
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_URL=https://admin.worktrace.my
VITE_APP_URL=https://app.worktrace.my
```

Get these from: **Supabase Dashboard → Settings → API**

### 3. Set up admin tables in Supabase

Run `01_schema.sql` in your Supabase SQL editor, then add yourself as admin:

```sql
-- Replace with YOUR email
INSERT INTO admin_users (user_id, email, name, role)
SELECT id, email, 'Super Admin', 'super_admin'
FROM auth.users
WHERE email = 'your@email.com';
```

### 4. Run locally

```bash
npm run dev
# Opens at http://localhost:5173
```

---

## Deploy to admin.worktrace.my

### Option A — Vercel (recommended)

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Set custom domain: `admin.worktrace.my`

### Option B — Netlify

1. Push to GitHub
2. Import in [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables
6. Set custom domain: `admin.worktrace.my`

---

## Pages

| Route | Description |
|---|---|
| `/dashboard` | Overview — stats, charts, recent activity |
| `/users` | All users with search, filter, export CSV |
| `/users/:id` | User detail — info, activity, subscription, tickets |
| `/pro-users` | Pro & Team users, expiry tracking |
| `/subscriptions` | Subscription events and revenue |
| `/support` | Support tickets list |
| `/support/:id` | Ticket detail with reply thread |
| `/analytics` | Revenue charts and analytics |
| `/referrals` | Referral program tracking |
| `/discounts` | Discount codes management |
| `/announcements` | In-app announcements |
| `/health` | System health — DB, functions, storage |
| `/admin-management` | Manage admin users |

---

## Admin Actions Available

- **Upgrade user to Pro** — instantly via UI
- **Downgrade user to Free**
- **Extend subscription** by 1 month
- **Reply to support tickets** — with email templates
- **Create discount codes** — % or fixed amount
- **Publish announcements** — banner, modal, or toast
- **Monitor system health** — DB tables, edge functions, storage

---

## Tech Stack

- **React 18** + TypeScript
- **Vite** — fast dev server and build
- **Tailwind CSS** — utility-first styling
- **React Router v6** — client-side routing
- **Supabase** — same DB as main app
- **Recharts** — charts and analytics
- **date-fns** — date formatting (Bahasa Malaysia)
- **Lucide React** — icons

---

## Notes

- Uses the **same Supabase project** as the main WorkTrace app
- Admin authentication is separate from user auth
- Only users in the `admin_users` table can log in
- Real-time updates for support ticket counts via Supabase Realtime
- All queries respect RLS (Row Level Security)
