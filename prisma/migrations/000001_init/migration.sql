-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StudentSeat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "sessionNo" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "seatNo" TEXT NOT NULL,
    "stageAnnouncingName" TEXT NOT NULL,
    "ticketCategory" TEXT NOT NULL,
    "balconyVisitorSeatNos" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSeat_referenceId_key" ON "StudentSeat"("referenceId");

-- CreateIndex
CREATE INDEX "StudentSeat_sessionNo_idx" ON "StudentSeat"("sessionNo");

-- CreateIndex
CREATE INDEX "StudentSeat_studentId_idx" ON "StudentSeat"("studentId");

-- CreateIndex
CREATE INDEX "StudentSeat_seatNo_idx" ON "StudentSeat"("seatNo");

-- CreateIndex
CREATE INDEX "StudentSeat_ticketCategory_idx" ON "StudentSeat"("ticketCategory");
