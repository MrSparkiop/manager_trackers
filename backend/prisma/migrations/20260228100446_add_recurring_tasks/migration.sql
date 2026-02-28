-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "parentTaskId" TEXT,
ADD COLUMN     "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "recurrenceEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "team_tasks" ADD COLUMN     "parentTaskId" TEXT,
ADD COLUMN     "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "recurrenceEndDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "team_tasks_parentTaskId_idx" ON "team_tasks"("parentTaskId");

-- AddForeignKey
ALTER TABLE "team_tasks" ADD CONSTRAINT "team_tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "team_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
