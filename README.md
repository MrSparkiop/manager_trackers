# TrackFlow — Personal Schedule Manager

> A professional full-stack schedule and task management application built with React, NestJS, and PostgreSQL.

![TrackFlow Dashboard]

---

## ✨ Features

### 📊 Dashboard
- Overview of today's tasks and overdue items
- Time summary (today, this week, all time)
- Active projects count
- Quick glance at priority tasks

### 📁 Projects
- Create and manage projects with custom colors
- Track project status (Active, On Hold, Completed, Archived)
- Visual progress bar showing task completion per project
- Set project deadlines
- Edit and delete projects

### ✅ Tasks
- Full task management with title, description, priority and status
- Group tasks by status: To Do, In Progress, In Review, Done, Cancelled
- Set task priority: Low, Medium, High, Urgent
- Link tasks to projects
- Set due dates and estimated time
- Filter tasks by status, priority, and project
- One-click toggle to mark tasks as done
- Edit and delete tasks

### ⏱ Time Tracker
- Live running timer with real-time seconds display
- Start and stop timer with one click
- Link time entries to specific tasks
- Add manual time entries with custom date and time range
- View time history grouped by date
- Time summary: today, this week, all time
- Delete time entries

### 📅 Calendar
- Full monthly calendar view
- Click any day to see events in the side panel
- Double-click a day to quickly create an event
- Create events with custom colors
- Set all-day or timed events
- Link calendar events to tasks
- Navigate between months
- Delete events

### 🔐 Authentication
- Secure user registration and login
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Protected routes
- Persistent login session

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| React Router v6 | Client-side Routing |
| TanStack Query | Server State Management |
| Zustand | Client State Management |
| Axios | HTTP Client |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| NestJS | Backend Framework |
| TypeScript | Type Safety |
| Prisma ORM | Database Access |
| PostgreSQL | Database |
| JWT + Passport | Authentication |
| bcrypt | Password Hashing |
| class-validator | Input Validation |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker | Local PostgreSQL |
| Vercel | Frontend Hosting |
| Railway | Backend + DB Hosting |
| GitHub | Version Control |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm
- Docker Desktop
- Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/client-trackers.git
cd client-trackers
```

### 2. Start the database
```bash
docker-compose up -d
```

### 3. Setup the Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev
```

Backend will run on: `http://localhost:3000`

### 4. Setup the Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend will run on: `http://localhost:5173`

---

## 📁 Project Structure

```
client-trackers/
├── backend/
│   ├── src/
│   │   ├── auth/               # Authentication module
│   │   │   ├── dto/
│   │   │   └── strategies/
│   │   ├── calendar/           # Calendar events module
│   │   │   └── dto/
│   │   ├── prisma/             # Prisma service & module
│   │   ├── projects/           # Projects module
│   │   │   └── dto/
│   │   ├── tasks/              # Tasks module
│   │   │   └── dto/
│   │   ├── time-tracker/       # Time tracking module
│   │   │   └── dto/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx      # App shell & sidebar
│   │   ├── lib/
│   │   │   └── axios.ts        # API client
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── TasksPage.tsx
│   │   │   ├── TimeTrackerPage.tsx
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── store/
│   │   │   └── authStore.ts    # Auth state (Zustand)
│   │   └── App.tsx
│   └── .env
│
└── docker-compose.yml
```

---

## 🗄 Database Schema

```
User
 ├── Projects (1:many)
 ├── Tasks (1:many)
 ├── TimeEntries (1:many)
 └── CalendarEvents (1:many)

Project
 └── Tasks (1:many)

Task
 ├── TimeEntries (1:many)
 ├── CalendarEvents (1:many)
 ├── SubTasks (self-relation)
 └── Tags (many:many)

TimeEntry
 └── Task (many:1, optional)

CalendarEvent
 └── Task (many:1, optional)
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | Get all projects |
| GET | `/api/projects/:id` | Get project by ID |
| GET | `/api/projects/stats` | Get project stats |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Get all tasks (with filters) |
| GET | `/api/tasks/today` | Get today's tasks |
| GET | `/api/tasks/overdue` | Get overdue tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

### Time Tracker
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/time-tracker` | Get all entries |
| GET | `/api/time-tracker/running` | Get running timer |
| GET | `/api/time-tracker/summary` | Get time summary |
| POST | `/api/time-tracker/start` | Start timer |
| POST | `/api/time-tracker/stop/:id` | Stop timer |
| POST | `/api/time-tracker/manual` | Add manual entry |
| DELETE | `/api/time-tracker/:id` | Delete entry |

### Calendar
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/calendar` | Get all events |
| POST | `/api/calendar` | Create event |
| DELETE | `/api/calendar/:id` | Delete event |

---

## 🌍 Deployment

### Frontend → Vercel
1. Push to GitHub
2. Connect repo to Vercel
3. Set `VITE_API_URL` environment variable to your Railway backend URL
4. Deploy

### Backend + DB → Railway
1. Create new Railway project
2. Add PostgreSQL service
3. Deploy backend from GitHub
4. Set environment variables (DATABASE_URL, JWT_SECRET, etc.)
5. Done

---

## 📄 Environment Variables

### Backend `.env`
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/client_tracker"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:3000/api
```

---
