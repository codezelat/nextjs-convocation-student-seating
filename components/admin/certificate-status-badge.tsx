import { Badge } from "@/components/ui/badge";
import {
  CERTIFICATE_REQUEST_STATUSES,
  CERTIFICATE_STATUS_LABELS,
  type CertificateRequestStatus,
} from "@/lib/certificates/constants";

export function CertificateStatusBadge({ status }: { status: string }) {
  const safeStatus = CERTIFICATE_REQUEST_STATUSES.includes(
    status as CertificateRequestStatus
  )
    ? (status as CertificateRequestStatus)
    : "PENDING";

  return (
    <Badge variant={safeStatus === "REJECTED" ? "destructive" : safeStatus === "PENDING" ? "outline" : "secondary"}>
      {CERTIFICATE_STATUS_LABELS[safeStatus]}
    </Badge>
  );
}
