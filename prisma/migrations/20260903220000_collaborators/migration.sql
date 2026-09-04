-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CollaboratorRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: WeddingCollaborator
CREATE TABLE IF NOT EXISTS "WeddingCollaborator" (
  "id"        TEXT NOT NULL,
  "weddingId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "role"      "CollaboratorRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WeddingCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeddingCollaborator_weddingId_userId_key"
  ON "WeddingCollaborator"("weddingId", "userId");

ALTER TABLE "WeddingCollaborator"
  ADD CONSTRAINT "WeddingCollaborator_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WeddingCollaborator"
  ADD CONSTRAINT "WeddingCollaborator_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: CollaboratorInvite
CREATE TABLE IF NOT EXISTS "CollaboratorInvite" (
  "id"         TEXT NOT NULL,
  "weddingId"  TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "role"       "CollaboratorRole" NOT NULL,
  "token"      TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CollaboratorInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CollaboratorInvite_token_key"
  ON "CollaboratorInvite"("token");

ALTER TABLE "CollaboratorInvite"
  ADD CONSTRAINT "CollaboratorInvite_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
