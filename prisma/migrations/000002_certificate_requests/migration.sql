-- CreateTable
CREATE TABLE "CertificateRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "confirmedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
