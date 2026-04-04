-- Add pendingWarning column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pendingWarning" BOOLEAN NOT NULL DEFAULT false;
