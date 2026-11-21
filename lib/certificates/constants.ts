export const SRI_LANKA_DISTRICTS = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
] as const;

export const CERTIFICATE_REQUEST_STATUSES = [
  "PENDING",
  "VERIFIED",
  "PREPARING",
  "DISPATCHED",
  "REJECTED",
] as const;

export type CertificateRequestStatus =
  (typeof CERTIFICATE_REQUEST_STATUSES)[number];

export const CERTIFICATE_STATUS_LABELS: Record<
  CertificateRequestStatus,
  string
> = {
  PENDING: "Pending review",
  VERIFIED: "Verified",
  PREPARING: "Preparing",
  DISPATCHED: "Dispatched",
  REJECTED: "Rejected",
};

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const MAX_RECEIPT_SIZE_LABEL = "5 MB";
export const RECEIPT_FIRST_CHUNK_BYTES = 4 * 1024 * 1024;
