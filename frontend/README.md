# TrackFlow 📋

A full-stack personal schedule and project management SaaS application built with React, NestJS, and PostgreSQL.

![Version](https://img.shields.io/badge/version-2.0.0-6366f1)
![License](https://img.shields.io/badge/license-MIT-green)
![Docker](https://img.shields.io/badge/docker-ready-2496ED)

---

## ✨ Features

- **Dashboard** — Overview with charts (tasks by status, priority, project progress), today's tasks and time summary
- **Projects** — Grid and Kanban board view with drag & drop, progress tracking, color labels
- **Tasks** — Grouped by status, quick add, inline subtasks, bulk select & delete, drag & drop, search & filters
- **Time Tracker** — Live timer with seconds, manual entries, history grouped by date, weekly summary
- **Calendar** — Monthly view, color-coded events, link events to tasks, side panel
- **Settings** — Profile management, appearance (dark/light mode)
- **Auth** — Secure JWT authentication with HttpOnly cookies and automatic token refresh

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| React Router v6 | Routing |
| TanStack Query | Server state management |
| Zustand + persist | Client state management |
| Axios | HTTP client with interceptors |
| Recharts | Dashboard charts |
| @dnd-kit | Drag and drop |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| NestJS | Backend framework |
| Prisma ORM | Database ORM |
| PostgreSQL | Database |
| JWT + Passport | Authentication |
| bcrypt | Password hashing |
| cookie-parser | HttpOnly cookie support |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerization |
| Prisma Migrations | Database versioning |

---

## 🚀 Getting Started

### Option 1 — Docker (Recommended)

The easiest way to run the entire stack with a single command:
```bash
git clone https://github.com/MrSparkiop/manager_trackers.git
cd manager_trackers
docker-compose up --build
```

This starts all 3 services automatically:
- **PostgreSQL** on port `5432`
- **Backend API** on port `3000`
- **Frontend** on port `5173`

Open http://localhost:5173 and register a new account.

---

### Option 2 — Manual Setup

#### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm

#### 1. Clone the repository
```bash
git clone https://github.com/MrSparkiop/manager_trackers.git
cd manager_trackers
```

#### 2. Setup the backend
```bash
cd backend
npm install
cp .env.example .env   # edit with your values
npx prisma migrate dev
npm run start:dev
```

#### 3. Setup the frontend
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/client_tracker"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
NODE_ENV=development
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3000/api
```

---

## 🗄️ Database Schema
```
User
 ├── Projects (userId)
 ├── Tasks (userId, projectId?, parentId?)
 │    └── SubTasks (parentId)
 ├── TimeEntries (userId, taskId?)
 └── CalendarEvents (userId, taskId?)
```

---

## 🔐 Security

- Passwords hashed with **bcrypt** (10 rounds)
- JWT tokens stored in **HttpOnly cookies** (not localStorage — XSS safe)
- **Refresh token rotation** — new refresh token issued on every refresh
- Refresh tokens **hashed in database** before storage
- **CORS** restricted to allowed origins via environment variable
- Automatic token refresh on 401 with request queue

---

## 📁 Project Structure
```
manager_trackers/
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── components/        # Layout, Skeleton
│   │   ├── pages/             # Dashboard, Projects, Tasks, etc.
│   │   ├── store/             # Zustand stores (auth, theme)
│   │   └── lib/               # Axios instance
│   └── Dockerfile
├── backend/                   # NestJS app
│   ├── src/
│   │   ├── auth/              # JWT auth, strategies, guards
│   │   ├── projects/          # Projects CRUD
│   │   ├── tasks/             # Tasks CRUD
│   │   ├── time-tracker/      # Time entries
│   │   ├── calendar/          # Calendar events
│   │   └── prisma/            # Prisma service
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── Dockerfile
└── docker-compose.yml         # Full stack orchestration
```

---

## 📜 Changelog

### v2.0.0
- 🔐 Replaced localStorage JWT with HttpOnly cookies
- 🔄 Implemented refresh token rotation with automatic retry
- 🗂️ Added Kanban board view with drag & drop
- ⚡ Quick add tasks inline, bulk delete, subtasks, search
- 📊 Dashboard charts (Recharts) — status, priority, project progress
- 🌙 Dark/Light mode toggle persisted to localStorage
- 💀 Loading skeleton animations
- ⚙️ Settings page with profile management
- 🐳 Full Docker Compose setup (DB + backend + frontend)
- 📈 Prisma database indexes on all foreign keys
- 🌐 CORS configuration via environment variables

### v1.0.0
- ✅ Auth (register, login, logout)
- 📁 Projects CRUD with colors and status
- ✅ Tasks with status, priority, due dates
- ⏱ Time tracker with live timer and history
- 📅 Calendar with events linked to tasks

---

## 👤 Author

**Blagoy** — [@MrSparkiop](https://github.com/MrSparkiop)