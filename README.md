# TrackFlow

A full-stack project management app built with React, NestJS, and PostgreSQL.

![Version](https://img.shields.io/badge/version-2.0.0-6366f1?style=flat-square)
![Docker](https://img.shields.io/badge/docker-ready-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Zustand |
| Backend | NestJS, Prisma, PostgreSQL |
| Auth | JWT (HttpOnly cookies + refresh token rotation) |
| Realtime | Socket.io (notifications, online indicators) |
| DevOps | Docker, Docker Compose |

---

## Features

- **Auth** — Register, login, refresh tokens, password reset via email
- **Tasks** — CRUD, subtasks, priorities, drag & drop, bulk actions, recurring tasks
- **Projects** — Kanban board, progress tracking, soft delete
- **Teams** — Workspaces, invite links, shared projects, member roles (PRO only)
- **Time Tracker** — Live timer, manual entries, per-task summaries
- **Calendar** — Monthly view with events and deadlines
- **Tags** — Color-coded labels, assign to tasks
- **Global Search** — Ctrl+K search across tasks, projects, teams and tags
- **Notifications** — Real-time bell with WebSocket, mark as read
- **Admin Panel** — User management, role control, announcements with role targeting
- **PRO Role** — Team collaboration locked behind PRO/ADMIN role
- **Dark / Light theme** — Full theme support
- **Mobile responsive** — Drawer navigation on mobile

---

## Quick Start

```bash
git clone https://github.com/MrSparkiop/manager_trackers.git
cd manager_trackers
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api/docs |

---

## Environment Variables

**`backend/.env`**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/client_tracker"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional — for password reset emails
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@email.com
MAIL_PASS=your-app-password
```

**`frontend/.env.local`**
```env
VITE_API_URL=http://localhost:3000
```

---

## Make Yourself Admin

```bash
docker-compose exec postgres psql -U postgres -d client_tracker \
  -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

---

## Project Structure

```
├── backend/src/
│   ├── auth/           # Login, register, refresh, password reset
│   ├── tasks/          # Tasks, subtasks, recurring
│   ├── projects/       # Projects, Kanban
│   ├── teams/          # Team workspaces, invites, shared tasks
│   ├── notifications/  # WebSocket gateway, notification CRUD
│   ├── search/         # Global search endpoint
│   ├── admin/          # User management, announcements, config
│   ├── time-tracker/   # Time entries
│   ├── calendar/       # Calendar events
│   └── tags/           # Tags
├── frontend/src/
│   ├── pages/          # All page components
│   ├── components/     # Shared UI (Layout, Skeletons, Modals)
│   ├── store/          # Zustand (auth, theme)
│   └── lib/            # Axios, Socket.io
└── docker-compose.yml
```

---

## Security

- HttpOnly cookies — XSS protection
- Refresh token rotation with bcrypt hashing
- Rate limiting on auth endpoints (5 login / 3 register per minute)
- CORS configured via environment variables 
- Admin self-protection — cannot delete or suspend own account

---

## License

MIT © [MrSparkiop](https://github.com/MrSparkiop)