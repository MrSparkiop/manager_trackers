-- Add audioUrl column to chat_messages (MinIO object key for voice messages)
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "audioUrl" TEXT;
