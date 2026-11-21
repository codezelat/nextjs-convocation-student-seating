import "server-only";

import { Prisma } from "@prisma/client";

import type {
  CertificateAdminUpdate,
  CertificateRequestFields,
} from "@/lib/certificates/validation";
import { db } from "@/lib/db";
import { containsAdminQuery } from "@/lib/data/seat-filters";

export type CertificateReceiptRecord = {
  receiptObjectKey: string;
  receiptFileName: string;
};

export type AdminCertificateRequest = {
  id: string;
  studentId: string;
  fullName: string;
  whatsappNumber: string;
  deliveryAddress: string;
  district: string;
  deliveryContactNumber: string;
  receiptObjectKey: string;
  receiptFileName: string;
  receiptContentType: string;
  receiptSizeBytes: number;
  status: string;
  internalNote: string | null;
  courierReference: string | null;
  confirmedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const certificateRequestSelect = {
  id: true,
  studentId: true,
  fullName: true,
  whatsappNumber: true,
  deliveryAddress: true,
  district: true,
  deliveryContactNumber: true,
  receiptObjectKey: true,
  receiptFileName: true,
  receiptContentType: true,
  receiptSizeBytes: true,
  status: true,
  internalNote: true,
  courierReference: true,
  confirmedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CertificateRequestSelect;

export async function createCertificateRequest(
  fields: CertificateRequestFields & {
    receiptObjectKey: string;
    receiptFileName: string;
    receiptContentType: string;
    receiptSizeBytes: number;
    sourceHash?: string;
  }
) {
  return db.certificateRequest.create({
    data: {
      ...fields,
      sourceHash: fields.sourceHash ?? null,
      confirmedAt: new Date(),
    },
    select: certificateRequestSelect,
  });
}

export async function findCertificateRequestByStudentId(studentId: string) {
  return db.certificateRequest.findUnique({
    where: { studentId: studentId.trim().toUpperCase() },
    select: { id: true },
  });
}

export async function findCertificateRequestById(id: string) {
  return db.certificateRequest.findUnique({
    where: { id },
    select: certificateRequestSelect,
  });
}

export async function findCertificateReceiptById(id: string) {
  return db.certificateRequest.findUnique({
    where: { id },
    select: {
      receiptObjectKey: true,
      receiptFileName: true,
    },
  });
}

export async function listCertificateRequests({
  query = "",
  status = "ALL",
  page = 1,
  pageSize = 20,
}: {
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
  const normalizedPageSize = Number.isFinite(pageSize) ? pageSize : 20;
  const safePageSize = Math.min(100, Math.max(5, normalizedPageSize));
  const trimmedQuery = query.trim();
  const matches = containsAdminQuery(trimmedQuery);
  const where: Prisma.CertificateRequestWhereInput = {
    ...(status !== "ALL" ? { status } : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { studentId: matches },
            { fullName: matches },
            { whatsappNumber: matches },
            { deliveryContactNumber: matches },
            { district: matches },
          ],
        }
      : {}),
  };

  const total = await db.certificateRequest.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const requests = await db.certificateRequest.findMany({
    where,
    select: certificateRequestSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * safePageSize,
    take: safePageSize,
  });

  return {
    requests,
    page: currentPage,
    pageSize: safePageSize,
    total,
    totalPages,
  };
}

export async function getCertificateRequestStats() {
  const [total, statusGroups] = await Promise.all([
    db.certificateRequest.count(),
    db.certificateRequest.groupBy({ by: ["status"], _count: true }),
  ]);

  return {
    total,
    statuses: Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count])
    ) as Record<string, number>,
  };
}

export async function updateCertificateRequest(
  id: string,
  input: CertificateAdminUpdate
) {
  return db.certificateRequest.update({
    where: { id },
    data: {
      studentId: input.studentId,
      fullName: input.fullName,
      whatsappNumber: input.whatsappNumber,
      deliveryAddress: input.deliveryAddress,
      district: input.district,
      deliveryContactNumber: input.deliveryContactNumber,
      status: input.status,
      internalNote: input.internalNote || null,
      courierReference: input.courierReference || null,
    },
    select: certificateRequestSelect,
  });
}

export async function deleteCertificateRequestRecord(id: string) {
  return db.certificateRequest.delete({ where: { id } });
}

export async function countRecentCertificateRequestsBySource(
  sourceHash: string,
  since: Date
) {
  return db.certificateRequest.count({
    where: { sourceHash, createdAt: { gte: since } },
  });
}
