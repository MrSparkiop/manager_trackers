-- Change default team member role from EDITOR to VIEWER
-- New members joining via invite code get read-only access by default
ALTER TABLE "team_members" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
