-- Custom Team Roles: owner-defined roles with boolean permission flags
CREATE TABLE "custom_team_roles" (
    "id"                 TEXT NOT NULL,
    "name"               TEXT NOT NULL,
    "canInviteMembers"   BOOLEAN NOT NULL DEFAULT false,
    "canManageProjects"  BOOLEAN NOT NULL DEFAULT false,
    "canDeleteTasks"     BOOLEAN NOT NULL DEFAULT false,
    "canManageSettings"  BOOLEAN NOT NULL DEFAULT false,
    "teamId"             TEXT NOT NULL,
    CONSTRAINT "custom_team_roles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "custom_team_roles"
    ADD CONSTRAINT "custom_team_roles_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "custom_team_roles_teamId_name_key" ON "custom_team_roles"("teamId", "name");

-- Add optional customRoleId to team_members
ALTER TABLE "team_members" ADD COLUMN "customRoleId" TEXT;

ALTER TABLE "team_members"
    ADD CONSTRAINT "team_members_customRoleId_fkey"
    FOREIGN KEY ("customRoleId") REFERENCES "custom_team_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Admin audit log: immutable record of sensitive admin actions
CREATE TABLE "admin_audit_logs" (
    "id"            TEXT NOT NULL,
    "action"        TEXT NOT NULL,
    "adminId"       TEXT NOT NULL,
    "targetUserId"  TEXT,
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_adminId_idx"      ON "admin_audit_logs"("adminId");
CREATE INDEX "admin_audit_logs_targetUserId_idx" ON "admin_audit_logs"("targetUserId");
