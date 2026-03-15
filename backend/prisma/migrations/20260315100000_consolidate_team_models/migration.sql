-- Migration: Consolidate TeamTask → Task and TeamProject → Project
-- Eliminates the separate team_tasks, team_projects, and team_task_comments tables
-- by adding a nullable teamId column to the existing tasks and projects tables.

-- ── Step 1: Add teamId to projects ─────────────────────────────────────────
ALTER TABLE "projects" ADD COLUMN "teamId" TEXT;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "projects_teamId_idx" ON "projects"("teamId");

-- ── Step 2: Add teamId to tasks ─────────────────────────────────────────────
ALTER TABLE "tasks" ADD COLUMN "teamId" TEXT;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "tasks_teamId_idx" ON "tasks"("teamId");

-- ── Step 3: Migrate team_projects → projects ────────────────────────────────
-- Uses the team owner as userId (creator/owner of the project)
INSERT INTO "projects" (
  "id", "name", "description", "color", "status",
  "deadline", "createdAt", "updatedAt", "userId", "teamId"
)
SELECT
  tp.id, tp.name, tp.description, tp.color, tp.status,
  tp.deadline, tp."createdAt", tp."updatedAt",
  t."ownerId",  -- team owner becomes the project's userId
  tp."teamId"
FROM "team_projects" tp
JOIN "teams" t ON t.id = tp."teamId";

-- ── Step 4: Migrate team_tasks → tasks ─────────────────────────────────────
-- Uses the team owner as userId; teamId marks it as a team task
INSERT INTO "tasks" (
  "id", "title", "description", "status", "priority",
  "dueDate", "completedAt", "createdAt", "updatedAt",
  "recurrence", "recurrenceEndDate", "parentTaskId",
  "userId", "teamId", "projectId", "assigneeId"
)
SELECT
  tt.id, tt.title, tt.description, tt.status, tt.priority,
  tt."dueDate", tt."completedAt", tt."createdAt", tt."updatedAt",
  tt.recurrence, tt."recurrenceEndDate", tt."parentTaskId",
  t."ownerId",  -- team owner becomes the task's userId
  tp."teamId",  -- teamId marks it as a team task
  tt."projectId",
  tt."assigneeId"
FROM "team_tasks" tt
JOIN "team_projects" tp ON tp.id = tt."projectId"
JOIN "teams" t ON t.id = tp."teamId";

-- ── Step 5: Migrate team_task_comments → task_comments ─────────────────────
-- team_task_comments stored authorName/authorEmail; task_comments use authorId FK
INSERT INTO "task_comments" (
  "id", "content", "createdAt", "updatedAt", "taskId", "authorId"
)
SELECT
  ttc.id, ttc.content, ttc."createdAt", ttc."createdAt",
  ttc."taskId",
  ttc."userId"  -- authorId = the userId who wrote the comment
FROM "team_task_comments" ttc;

-- ── Step 6: Drop old tables ──────────────────────────────────────────────────
DROP TABLE IF EXISTS "team_task_comments";
DROP TABLE IF EXISTS "team_tasks";
DROP TABLE IF EXISTS "team_projects";
