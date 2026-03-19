-- Expand TeamRole: OWNER | MEMBER  →  OWNER | ADMIN | EDITOR | VIEWER
-- PostgreSQL does not allow removing enum values, so we recreate the type.

-- 1. Drop the default first (required before changing the column type)
ALTER TABLE "team_members" ALTER COLUMN "role" DROP DEFAULT;

-- 2. Create new enum with all four roles
CREATE TYPE "TeamRole_new" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- 3. Migrate existing rows: OWNER stays OWNER, MEMBER becomes EDITOR
ALTER TABLE "team_members"
  ALTER COLUMN "role" TYPE "TeamRole_new"
  USING (
    CASE "role"::text
      WHEN 'OWNER' THEN 'OWNER'::"TeamRole_new"
      ELSE 'EDITOR'::"TeamRole_new"
    END
  );

-- 4. Drop old type and rename new one
DROP TYPE "TeamRole";
ALTER TYPE "TeamRole_new" RENAME TO "TeamRole";

-- 5. Restore the default as EDITOR
ALTER TABLE "team_members" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
