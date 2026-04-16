-- ReportStatus enum (includes SUSPENDED for reports that resulted in user suspension)
DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'WARNED', 'SUSPENDED', 'DELETED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- If the enum already existed without SUSPENDED (e.g. from a prior partial apply), add it.
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- message_reports table
CREATE TABLE IF NOT EXISTS "message_reports" (
  "id"         TEXT           NOT NULL,
  "reason"     TEXT           NOT NULL,
  "status"     "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"  TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "adminNote"  TEXT,
  "messageId"  TEXT           NOT NULL,
  "reporterId" TEXT           NOT NULL,
  CONSTRAINT "message_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "message_reports_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  CONSTRAINT "message_reports_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "message_reports_status_idx"    ON "message_reports"("status");
CREATE INDEX IF NOT EXISTS "message_reports_messageId_idx" ON "message_reports"("messageId");
