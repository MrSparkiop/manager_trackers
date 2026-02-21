# TrackFlow 🚀

A modern, full-stack project management SaaS application built with React, NestJS, and PostgreSQL.

![TrackFlow](https://img.shields.io/badge/version-2.0.0-6366f1?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge)
![Docker](https://img.shields.io/badge/docker-ready-60a5fa?style=for-the-badge)

## ✨ Features

- **Authentication** — Register, login, logout with HttpOnly cookie JWT, refresh token rotation and password reset via email
- **Dashboard** — Overview stats, task completion charts, recent activity and productivity insights
- **Task Management** — Create, edit, delete tasks with priorities, statuses, subtasks, due dates, bulk actions and drag & drop
- **Project Tracking** — Manage projects with Kanban boards, progress tracking and deadline management
- **Time Tracker** — Live timer, manual time entries and time summaries per task and project
- **Calendar** — Monthly calendar view with events, task deadlines and scheduling
- **Tags & Labels** — Color-coded tags to organize and filter tasks
- **Dark / Light Mode** — Full theme support across all pages
- **Mobile Responsive** — Fully responsive design with mobile drawer navigation
- **Landing Page** — Beautiful marketing homepage with features, pricing and FAQ sections

## 🛠 Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- React Router v6
- TanStack Query (React Query)
- Zustand (state management)
- Recharts (analytics charts)
- React Hot Toast (notifications)
- Lucide React (icons)
- @dnd-kit (drag and drop)

**Backend**
- NestJS + TypeScript
- Prisma ORM
- PostgreSQL
- JWT (HttpOnly cookies + refresh tokens)
- Bcrypt (password hashing)
- Nodemailer (password reset emails)
- Swagger (API docs)

**DevOps**
- Docker + Docker Compose
- Multi-stage builds

## 🚀 Getting Started

### Prerequisites
- Docker Desktop
- Node.js 18+
- Git

### Run with Docker (Recommended)
```bash
# Clone the repository
git clone https://github.com/MrSparkiop/manager_trackers.git
cd manager_trackers

# Start all services
docker-compose up --build
```

Services will be available at:
- **Frontend** → http://localhost:5173
- **Backend API** → http://localhost:3000
- **Swagger Docs** → http://localhost:3000/api/docs

### Run Locally (Without Docker)

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## ⚙️ Environment Variables

**backend/.env**
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

# Mail (optional - for password reset)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-email@gmail.com
```

**frontend/.env.local**
```env
VITE_API_URL=http://localhost:3000
```

## 📁 Project Structure
```
manager_trackers/
├── backend/
│   ├── src/
│   │   ├── auth/          # Authentication (login, register, refresh, password reset)
│   │   ├── tasks/         # Task CRUD, filters, subtasks
│   │   ├── projects/      # Project CRUD, Kanban
│   │   ├── time-tracker/  # Time entries, live timer
│   │   ├── calendar/      # Calendar events
│   │   ├── tags/          # Tags CRUD, assign to tasks
│   │   ├── mail/          # Email service (password reset)
│   │   └── prisma/        # Database service
│   └── prisma/
│       └── schema.prisma  # Database schema
├── frontend/
│   └── src/
│       ├── pages/         # All page components
│       ├── components/    # Shared components (Layout, etc.)
│       ├── store/         # Zustand stores
│       ├── lib/           # Axios instance
│       └── hooks/         # Custom hooks
└── docker-compose.yml
```

## 📸 Pages

| Page | Description |
|------|-------------|
| `/` | Landing page with features, pricing and FAQ |
| `/login` | Sign in with email and password |
| `/register` | Create a new account |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password via email link |
| `/app/dashboard` | Overview stats and charts |
| `/app/tasks` | Task list with filters and bulk actions |
| `/app/projects` | Project grid and Kanban board |
| `/app/time-tracker` | Time tracking with live timer |
| `/app/calendar` | Monthly calendar with events |
| `/app/tags` | Manage color-coded tags |
| `/app/settings` | Profile and preferences |

## 🔐 Security

- HttpOnly cookies (XSS protection)
- Refresh token rotation with bcrypt hashing
- CORS environment configuration
- Bcrypt password hashing (10 rounds)
- JWT with short expiry (15min access, 7d refresh)
- Password reset tokens with 1 hour expiry

## 📄 API Documentation

Swagger UI available at `http://localhost:3000/api/docs` when running in development mode.

## 📝 License

MIT © [MrSparkiop](https://github.com/MrSparkiop)