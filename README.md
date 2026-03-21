# TrackFlow

A full-stack project management and time tracking platform with team collaboration, Stripe billing, real-time notifications, and a complete admin panel.

![Version](https://img.shields.io/badge/version-2.0.0-6366f1?style=flat-square)
![Docker](https://img.shields.io/badge/docker-ready-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Zustand, TanStack Query, Recharts, dnd-kit, Socket.io Client |
| Backend | NestJS 11, TypeScript, Prisma 5, Passport JWT, class-validator |
| Database | PostgreSQL 15, Redis 7 |
| Realtime | Socket.io with Redis adapter (multi-instance support) |
| Payments | Stripe (subscriptions, webhooks, customer portal) |
| Monitoring | Sentry (frontend + backend, error tracking + profiling) |
| Infrastructure | Docker Compose (dev + production), Nginx |

---

## Features

### Application

- **Auth** — Register, login, refresh token rotation (HttpOnly cookies, SHA-256 hashed), password reset via email, password complexity enforcement
- **Tasks** — CRUD with pagination, subtasks, priorities, due dates, recurring tasks, drag & drop reordering, bulk delete, tags, attachments, comments, full activity audit log, estimated vs logged time tracking
- **Projects** — Personal project management, progress tracking, soft delete, grid and kanban views
- **Teams** — Workspaces with invite links, shared projects and tasks, member roles with granular permissions, custom team roles, @mention notifications, team workload and activity feeds (PRO only)
- **Time Tracker** — Live timer, manual entries, per-task time summaries with DB-level aggregation
- **Calendar** — Monthly view with events, deadlines, and recurrence
- **Insights** — Analytics dashboard with task completion rates, time per project, weekly velocity, priority distribution, focus tracking, and project workload — all computed via Prisma aggregates
- **Global Search** — `Ctrl+K` search across tasks, projects, teams, and tags
- **Notifications** — Real-time WebSocket bell with Redis pub/sub for multi-instance, mark as read, click-to-navigate
- **Support** — Submit and track help tickets with threaded replies and status updates
- **Billing** — Stripe PRO subscription with checkout, invoice history, customer portal (manage/cancel), webhook idempotency
- **Dark / Light theme** — Full theme support via Zustand store
- **Mobile responsive** — Drawer navigation with dedicated mobile top bar

### Admin Panel (`/admin`)

- Platform statistics dashboard
- User management — view, suspend, change roles, delete, impersonate (with audit trail)
- Billing management — grant/revoke PRO manually, view Stripe subscription status per user
- Activity log
- Global search across all users, tasks, and projects
- Announcements targeted by role (ALL, USER, PRO, ADMIN)
- Maintenance window scheduling with live countdown banners
- System configuration (disable registrations, maintenance mode)
- Support ticket queue with admin replies and status management
- Admin audit logs (impersonation, suspension, deletion)

---

## Security

- **HttpOnly cookies** — JWT access and refresh tokens stored in HttpOnly cookies, preventing XSS token theft
- **Refresh token rotation** — SHA-256 hashed tokens with automatic rotation on each refresh
- **No hardcoded secrets** — Application crashes on startup if `JWT_SECRET` is missing
- **Rate limiting** — Global 200 req/min via `@nestjs/throttler`, with stricter limits on auth endpoints (3-5/min)
- **CORS** — Configurable allowed origins via environment variables
- **Suspended user blocking** — Checked at JWT validation level on every request
- **Impersonation safety** — `NotImpersonatedGuard` blocks billing, password changes, and account deletion during impersonated sessions
- **Mass assignment protection** — All mutation endpoints use typed DTOs or explicit field whitelisting
- **Password policy** — Minimum 8 characters, requires uppercase, lowercase, and digit; max 128 characters (prevents bcrypt DoS)
- **Webhook idempotency** — Stripe events tracked in `StripeEvent` table to prevent duplicate processing
- **Network isolation** — PostgreSQL and Redis use `expose` (Docker-internal only) in production; `docker-compose.override.yml` opens ports for local development only
- **Sentry PII protection** — `sendDefaultPii: false` prevents session tokens and IPs from being sent to Sentry
- **Swagger disabled in production** — API docs only available when `NODE_ENV !== 'production'`
- **Admin self-protection** — Cannot suspend, delete, or demote own admin account
- **Anti-enumeration** — Forgot-password returns identical response whether email exists or not

---

## Roles & Permissions

| Role | Access |
|------|--------|
| `USER` | Personal tasks, projects, calendar, time tracking, support tickets |
| `PRO` | Everything in USER + unlimited teams, team projects, and team collaboration |
| `ADMIN` | Full platform access including admin panel, user management, and impersonation |

Permissions are enforced at three layers:

1. **JWT validation** — `isSuspended` blocks all requests; `isImpersonated` restricts sensitive actions
2. **Guard layer** — `RolesGuard` + `@Roles()` on controllers, `PermissionsGuard` + `@RequirePermissions()` for feature-gating, `TeamMemberGuard` on team routes, `ProjectOwnerGuard` / `TaskOwnerGuard` on resource routes, `NotImpersonatedGuard` on billing and account endpoints
3. **Service layer** — `requireAtLeast()` role hierarchy checks as defence-in-depth for nested team resources

---

## Project Structure
```
client_trackers/
├── backend/
│   ├── src/
│   │   ├── admin/            # User management, announcements, maintenance, billing, audit logs
│   │   ├── analytics/        # Insights dashboard (broken into focused sub-methods with aggregates)
│   │   ├── announcements/    # Role-targeted announcement CRUD
│   │   ├── auth/             # JWT strategy, guards (Roles, Permissions, NotImpersonated),
│   │   │                     #   decorators (@CurrentUser, @Roles, @RequirePermissions),
│   │   │                     #   last-seen middleware (throttled), maintenance middleware
│   │   ├── billing/          # Stripe checkout, portal, webhooks with idempotency
│   │   ├── calendar/         # Calendar events CRUD
│   │   ├── casl/             # CASL ability factory
│   │   ├── common/           # Shared utilities (date.utils, recurrence.utils)
│   │   ├── health/           # Health check endpoint with DB connectivity test
│   │   ├── mail/             # Transactional email (Nodemailer)
│   │   ├── notifications/    # WebSocket gateway (Redis-backed) + notification service
│   │   ├── prisma/           # PrismaService with audit-log middleware (AsyncLocalStorage)
│   │   ├── projects/         # Personal projects + ProjectOwnerGuard
│   │   ├── search/           # Global search
│   │   ├── support/          # Support tickets (user + admin controllers)
│   │   ├── tags/             # Task tags CRUD
│   │   ├── task-activity/    # Task audit trail
│   │   ├── tasks/            # Tasks with pagination, bulk delete, typed filters, TaskOwnerGuard
│   │   ├── teams/            # Teams, members, projects, tasks, comments, roles, workload, activity
│   │   └── time-tracker/     # Time entries with aggregate-based summaries
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── frontend/
│   └── src/
│       ├── components/       # SortableTaskRow, KanbanColumn, Layout, AdminLayout, NotificationBell,
│       │                     #   GlobalSearch, TaskDetailDrawer, Skeleton, EmptyState, modals
│       ├── lib/              # axios (with refresh queue), socket, useColors, useIsMobile,
│       │                     #   constants, formStyles, queryKeys
│       ├── pages/
│       │   ├── admin/        # AdminDashboard, AdminUsers, AdminBilling, AdminSupport, etc.
│       │   └── ...           # App pages (Tasks, Projects, Teams, Billing, Calendar, etc.)
│       ├── store/            # Zustand stores (auth with shared User type, theme)
│       └── types/            # Centralised TypeScript interfaces (User, Task, Project, etc.)
├── nginx/                    # Nginx configs for VPS reverse proxy
├── docker-compose.yml        # Base compose (dev defaults)
├── docker-compose.override.yml  # Local dev overrides (exposes DB/Redis ports)
└── docker-compose.prod.yml   # Production overrides (built assets, Nginx frontend, backups)
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

Create root **`.env`** (for Docker Compose):
```env
POSTGRES_PASSWORD=your-strong-postgres-password
DATABASE_URL=postgresql://postgres:your-url-encoded-password@postgres:5432/client_tracker
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
SENTRY_DSN_BACKEND=https://your-key@oXXXXXX.ingest.de.sentry.io/XXXXXXX
```

Create **`backend/.env`**:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres:5432/client_tracker"
JWT_SECRET="change-this-secret-min-32-chars"
JWT_REFRESH_SECRET="change-this-refresh-secret-min-32-chars"
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

### 2. Start (development)
```bash
docker-compose up -d
```

The `docker-compose.override.yml` automatically exposes PostgreSQL (5432) and Redis (6379) to localhost for debugging.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Swagger Docs | http://localhost:3000/api/docs |
| Health Check | http://localhost:3000/api/health |

Migrations run automatically on backend startup.

### 3. Start (production)
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Production mode:

- Backend runs `node dist/main` (compiled, no hot-reload)
- Frontend is built with `vite build` and served via Nginx with SPA fallback, API/WebSocket proxy, and static asset caching
- PostgreSQL and Redis are not exposed to the host network
- Swagger docs are disabled
- Healthchecks are enabled on the backend container

---

## Make Yourself Admin
```bash
docker-compose exec postgres psql -U postgres -d client_tracker \
  -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

---

## Database Backups

Run a one-off backup (production compose):
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backup
```

Backups are saved to `./backups/` as gzipped SQL dumps. Files older than 7 days are automatically cleaned up. Automate with a cron job:
```bash
0 3 * * * cd /path/to/client_trackers && docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backup
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
2. URL: `https://your-domain.com/api/billing/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_failed`
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

# Production build and deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Ensure your production `backend/.env` has:

- `DATABASE_URL` with host `postgres` (not `localhost`)
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-domain.com`
- `ALLOWED_ORIGINS=https://your-domain.com`

---

## API Overview

All endpoints prefixed with `/api`. Swagger docs available at `/api/docs` in development.

| Module | Prefix | Auth |
|--------|--------|------|
| Health | `/api/health` | Public |
| Auth | `/api/auth` | Mixed |
| Projects | `/api/projects` | JWT |
| Tasks | `/api/tasks` | JWT + Owner guard |
| Teams | `/api/teams` | JWT + Member guard |
| Time Tracker | `/api/time-tracker` | JWT |
| Calendar | `/api/calendar` | JWT |
| Tags | `/api/tags` | JWT |
| Analytics | `/api/analytics` | JWT |
| Search | `/api/search` | JWT |
| Notifications | `/api/notifications` | JWT |
| Support | `/api/support` | JWT |
| Billing | `/api/billing` | Mixed (webhook is public) |
| Admin | `/api/admin` | JWT + Admin permission |
| Admin Support | `/api/admin/support` | JWT + Admin permission |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Access token signing key (app crashes if missing) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `FRONTEND_URL` | Yes | Used for Stripe redirect URLs and CORS |
| `ALLOWED_ORIGINS` | Yes | CORS origins (comma-separated) |
| `NODE_ENV` | Yes (prod) | Set to `production` to disable Swagger and enable secure cookies |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Yes | Stripe Price ID for PRO plan |
| `STRIPE_WEBHOOK_SECRET` | Yes (prod) | Webhook signing secret |
| `STRIPE_WEBHOOK_SECRET_2` | No | Second signing secret (multiple webhook destinations) |
| `MAIL_HOST` | No | SMTP host |
| `MAIL_USER` | No | SMTP username |
| `MAIL_PASS` | No | SMTP app password |
| `SENTRY_DSN` | No | Sentry DSN for backend error tracking |
| `REDIS_URL` | Auto | Set automatically in Docker (`redis://redis:6379`) |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password (root `.env` for Docker Compose) |

---

## License

MIT © [MrSparkiop](https://github.com/MrSparkiop)