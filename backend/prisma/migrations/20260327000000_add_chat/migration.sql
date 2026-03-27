-- Add chat relations to users (no column changes needed, only new tables reference users)

-- MessageType enum
DO $$ BEGIN
  CREATE TYPE "MessageType" AS ENUM ('TEXT', 'VOICE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add CHAT_MESSAGE to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE';

-- Conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"        TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id"             TEXT         NOT NULL,
  "lastReadAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joinedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "conversationId" TEXT         NOT NULL,
  "userId"         TEXT         NOT NULL,
  CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversation_participants_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
  CONSTRAINT "conversation_participants_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "conversation_participants_conversationId_userId_key"
    UNIQUE ("conversationId", "userId")
);

CREATE INDEX IF NOT EXISTS "conversation_participants_userId_idx"         ON "conversation_participants"("userId");
CREATE INDEX IF NOT EXISTS "conversation_participants_conversationId_idx" ON "conversation_participants"("conversationId");

-- Chat messages table
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id"             TEXT         NOT NULL,
  "content"        TEXT,
  "type"           "MessageType" NOT NULL DEFAULT 'TEXT',
  "audioData"      TEXT,
  "audioDuration"  INTEGER,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "conversationId" TEXT         NOT NULL,
  "senderId"       TEXT         NOT NULL,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_messages_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
  CONSTRAINT "chat_messages_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "chat_messages_senderId_idx"                  ON "chat_messages"("senderId");
