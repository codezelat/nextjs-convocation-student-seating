-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSeat" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "sessionNo" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "seatNo" TEXT NOT NULL,
    "stageAnnouncingName" TEXT NOT NULL,
    "ticketCategory" TEXT NOT NULL,
    "balconyVisitorSeatNos" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "activeReferenceKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "deliveryContactNumber" TEXT NOT NULL,
    "receiptObjectKey" TEXT NOT NULL,
    "receiptFileName" TEXT NOT NULL,
    "receiptContentType" TEXT NOT NULL,
    "receiptSizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "internalNote" TEXT,
    "courierReference" TEXT,
    "sourceHash" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSeat_activeReferenceKey_key" ON "StudentSeat"("activeReferenceKey");

-- CreateIndex
CREATE INDEX "StudentSeat_referenceId_idx" ON "StudentSeat"("referenceId");

-- CreateIndex
CREATE INDEX "StudentSeat_status_idx" ON "StudentSeat"("status");

-- CreateIndex
CREATE INDEX "StudentSeat_sessionNo_idx" ON "StudentSeat"("sessionNo");

-- CreateIndex
CREATE INDEX "StudentSeat_studentId_idx" ON "StudentSeat"("studentId");

-- CreateIndex
CREATE INDEX "StudentSeat_seatNo_idx" ON "StudentSeat"("seatNo");

-- CreateIndex
CREATE INDEX "StudentSeat_ticketCategory_idx" ON "StudentSeat"("ticketCategory");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateRequest_studentId_key" ON "CertificateRequest"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateRequest_receiptObjectKey_key" ON "CertificateRequest"("receiptObjectKey");

-- CreateIndex
CREATE INDEX "CertificateRequest_status_createdAt_idx" ON "CertificateRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CertificateRequest_district_idx" ON "CertificateRequest"("district");

-- CreateIndex
CREATE INDEX "CertificateRequest_sourceHash_createdAt_idx" ON "CertificateRequest"("sourceHash", "createdAt");

