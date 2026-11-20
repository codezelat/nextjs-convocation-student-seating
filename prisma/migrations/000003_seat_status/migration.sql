-- AlterTable
ALTER TABLE "StudentSeat" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "StudentSeat" ADD COLUMN "activeReferenceKey" TEXT;

-- Backfill: every existing row is active, so mirror referenceId into the
-- partial-unique key (NULL = exempt from the unique index).
UPDATE "StudentSeat" SET "activeReferenceKey" = "referenceId";

-- DropIndex (referenceId is no longer globally unique; outdated rows may repeat it)
DROP INDEX "StudentSeat_referenceId_key";

-- CreateIndex
CREATE UNIQUE INDEX "StudentSeat_activeReferenceKey_key" ON "StudentSeat"("activeReferenceKey");
CREATE INDEX "StudentSeat_referenceId_idx" ON "StudentSeat"("referenceId");
CREATE INDEX "StudentSeat_status_idx" ON "StudentSeat"("status");
