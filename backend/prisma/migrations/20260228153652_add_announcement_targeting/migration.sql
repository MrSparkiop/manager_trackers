/*
  Warnings:

  - You are about to drop the column `active` on the `announcements` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TargetRole" AS ENUM ('ALL', 'USER', 'PRO', 'ADMIN');

-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "active",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "targetRole" "TargetRole" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';
