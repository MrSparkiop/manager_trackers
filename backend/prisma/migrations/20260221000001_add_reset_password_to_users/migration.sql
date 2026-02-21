-- AlterTable: add resetPasswordToken and resetPasswordExpiry columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordExpiry" TIMESTAMP(3);
