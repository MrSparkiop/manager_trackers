# TrackFlow

A full-stack project and task management platform with team collaboration, time tracking, Stripe billing, real-time notifications, and a complete admin panel.

![Version](https://img.shields.io/badge/version-2.0.0-6366f1?style=flat-square)
![Docker](https://img.shields.io/badge/docker-ready-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Zustand, TanStack Query, Recharts, Socket.io |
| Backend | NestJS 11, TypeScript, Prisma 5, Passport JWT |
| Database | PostgreSQL 15 |
| Realtime | Socket.io (notifications, online presence) |
| Payments | Stripe (subscriptions, webhooks, customer portal) |
| Monitoring | Sentry (frontend + backend) |
| Infrastructure | Docker Compose |

---

## Features

### Application
- **Auth** — Register, login, refresh token rotation (HttpOnly cookies), password reset via email
- **Tasks** — CRUD, subtasks, priorities, due dates, recurring tasks, drag & drop, bulk actions, tags, attachments, comments, full activity log
- **Projects** — Personal project management, progress tracking, soft delete
- **Teams** — Workspaces with invite links, shared projects and tasks, member roles (PRO only)
- **Time Tracker** — Live timer, manual entries, per-task summaries
- **Calendar** — Monthly view with events, deadlines, and recurrence
- **Insights** — Analytics dashboard with task completion rates, time spent, and activity trends
- **Global Search** — `Ctrl+K` search across tasks, projects, teams, and tags
- **Notifications** — Real-time bell with WebSocket, mark as read
- **Support** — Submit and track help tickets
- **Billing** — Stripe PRO subscription, invoice history, customer portal (manage/cancel)
- **Dark / Light theme** — Full theme support across all pages
- **Mobile responsive** — Drawer navigation on small screens

### Admin Panel (`/admin`)
- Platform stats dashboard
- User management — view, suspend, change roles, delete
- Billing management — grant / revoke PRO manually, view Stripe subscription status per user
- Activity log
- Global search
- Announcements targeted by role
- Maintenance window scheduling
- System configuration

---

## Roles & Permissions

| Role | Access |
|------|--------|
| `USER` | Personal tasks, projects, calendar, time tracking |
| `PRO` | Everything in USER + unlimited teams and team projects |
| `ADMIN` | Full platform access including admin panel |

Permissions are enforced at three layers:
1. **JWT validation** — `isSuspended` blocks all requests immediately
2. **Guard layer** — `RolesGuard` + `@Roles()` on controllers, `TeamMemberGuard` on team routes, `ProjectOwnerGuard` / `TaskOwnerGuard` on resource routes
3. **Service layer** — `requireOwner` / `requireMember` as defence-in-depth for nested resources

---

## Project Structure

```
client_trackers/
├── backend/
│   ├── src/
│   │   ├── admin/            # User management, announcements, maintenance, system config
│   │   ├── analytics/        # Usage analytics
│   │   ├── auth/             # JWT strategy, RolesGuard, decorators, last-seen middleware
│   │   ├── billing/          # Stripe checkout, portal, webhooks
│   │   ├── calendar/         # Calendar events
│   │   ├── mail/             # Transactional email (Nodemailer)
│   │   ├── notifications/    # Real-time WebSocket gateway
│   │   ├── prisma/           # Prisma service
│   │   ├── projects/         # Personal projects + ProjectOwnerGuard
│   │   ├── search/           # Global search
│   │   ├── support/          # Support tickets
│   │   ├── tags/             # Task tags
│   │   ├── task-activity/    # Task audit trail
│   │   ├── tasks/            # Tasks, subtasks, comments + TaskOwnerGuard
│   │   ├── teams/            # Teams, members, projects, tasks + TeamMemberGuard
│   │   └── time-tracker/     # Time entries
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── frontend/
│   └── src/
│       ├── components/       # Layout, AdminLayout, Navbar, NotificationBell, GlobalSearch
│       ├── lib/              # Axios instance, Socket.io client
│       ├── pages/
│       │   ├── admin/        # AdminDashboard, AdminUsers, AdminBilling, AdminSupport, etc.
│       │   └── ...           # App pages (Tasks, Projects, Teams, Billing, etc.)
│       └── store/            # Zustand stores (auth, theme)
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone and configure

```bash
git clone https://github.com/MrSparkiop/manager_trackers.git
cd manager_trackers
```

Create **`backend/.env`**:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres:5432/client_tracker"
JWT_SECRET="change-this-secret"
JWT_REFRESH_SECRET="change-this-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Email (Gmail SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your@gmail.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...

# Optional
SENTRY_DSN=https://...
```

Create root **`.env`** (for Docker Compose):

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_PASSWORD
POSTGRES_DB=client_tracker
```

### 2. Start

```bash
docker-compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api/docs |

Migrations run automatically on backend startup.

---

## Make Yourself Admin

```bash
docker-compose exec postgres psql -U postgres -d client_tracker \
  -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

---

## Stripe Setup

### Local development

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. `stripe login`
3. Forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

4. Copy the printed `whsec_...` into `backend/.env` as `STRIPE_WEBHOOK_SECRET`

### Production

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. URL: `http://YOUR_IP:3000/api/billing/webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy the signing secret to your server's `backend/.env`

### Test card

```
Number:  4242 4242 4242 4242
Expiry:  Any future date
CVC:     Any 3 digits
```

---

## Deployment (VPS)

```bash
ssh user@your-server-ip

cd /path/to/client_trackers
git pull

# Full rebuild
docker-compose up -d --build

# Or just restart the backend after a code change
docker restart client_tracker_backend
```

Ensure your production `backend/.env` has:
- `DATABASE_URL` with host `postgres` (not `localhost`)
- `FRONTEND_URL=http://YOUR_IP:5173`
- `ALLOWED_ORIGINS` includes your server IP

---

## API Overview

All endpoints prefixed with `/api`. Full docs at `/api/docs`.

| Module | Prefix |
|--------|--------|
| Auth | `/api/auth` |
| Projects | `/api/projects` |
| Tasks | `/api/tasks` |
| Teams | `/api/teams` |
| Time Tracker | `/api/time-tracker` |
| Calendar | `/api/calendar` |
| Tags | `/api/tags` |
| Analytics | `/api/analytics` |
| Search | `/api/search` |
| Notifications | `/api/notifications` |
| Support | `/api/support` |
| Billing | `/api/billing` |
| Admin | `/api/admin` |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `FRONTEND_URL` | Yes | Used for Stripe redirect URLs |
| `ALLOWED_ORIGINS` | Yes | CORS origins (comma-separated) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Yes | Stripe Price ID for PRO plan |
| `STRIPE_WEBHOOK_SECRET` | Yes (prod) | Webhook signing secret |
| `STRIPE_WEBHOOK_SECRET_2` | No | Second signing secret (multiple destinations) |
| `MAIL_HOST` | No | SMTP host |
| `MAIL_USER` | No | SMTP username |
| `MAIL_PASS` | No | SMTP app password |
| `SENTRY_DSN` | No | Sentry DSN for error tracking |

---

## Security

- HttpOnly cookies — XSS protection for JWT tokens
- Refresh token rotation with bcrypt hashing
- Rate limiting via `@nestjs/throttler` (200 req/min globally, stricter on auth)
- CORS configured via environment variables
- Suspended users blocked at JWT validation level (every request)
- Admin self-protection — cannot suspend or delete own account

---

## License

MIT © [MrSparkiop](https://github.com/MrSparkiop)
