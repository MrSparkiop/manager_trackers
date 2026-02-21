-- Delete orphaned tags (no userId) to satisfy NOT NULL constraint
DELETE FROM "_TagToTask" WHERE "A" IN (SELECT "id" FROM "tags");
DELETE FROM "tags";

-- AlterTable: add userId column
ALTER TABLE "tags" ADD COLUMN "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "tags_userId_idx" ON "tags"("userId");
