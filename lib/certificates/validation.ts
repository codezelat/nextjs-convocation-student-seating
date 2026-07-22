import { z } from "zod";

import {
  CERTIFICATE_REQUEST_STATUSES,
  SRI_LANKA_DISTRICTS,
} from "@/lib/certificates/constants";

const namePattern = /^[\p{L}\p{M}.' -]+$/u;
const studentIdPattern = /^[\p{L}\p{N}/._-]+$/u;

export const certificateRequestFieldsSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(2, "Enter your Student ID Number.")
    .max(64, "Student ID Number is too long.")
    .regex(studentIdPattern, "Enter a valid Student ID Number.")
    .transform((value) => value.toUpperCase()),
  fullName: z
    .string()
    .trim()
    .min(3, "Enter your full name.")
    .max(191, "Full name is too long.")
    .regex(namePattern, "Full name contains unsupported characters."),
  whatsappNumber: z
    .string()
    .trim()
    .transform(normalizePhoneInput)
    .refine(isSriLankanMobile, "Enter a valid Sri Lankan WhatsApp number.")
    .transform(toInternationalPhone),
  deliveryAddress: z
    .string()
    .trim()
    .min(10, "Enter your complete delivery address.")
    .max(500, "Delivery address is too long."),
  district: z.enum(SRI_LANKA_DISTRICTS, {
    error: "Select your district.",
  }),
  deliveryContactNumber: z
    .string()
    .trim()
    .transform(normalizePhoneInput)
    .refine(isSriLankanPhone, "Enter a valid Sri Lankan contact number.")
    .transform(toInternationalPhone),
});

export const certificateAdminUpdateSchema = certificateRequestFieldsSchema.extend({
  status: z.enum(CERTIFICATE_REQUEST_STATUSES),
  internalNote: z.string().trim().max(1000, "Internal note is too long."),
  courierReference: z
    .string()
    .trim()
    .max(191, "Courier reference is too long."),
});

export type CertificateRequestFields = z.infer<
  typeof certificateRequestFieldsSchema
>;
export type CertificateAdminUpdate = z.infer<
  typeof certificateAdminUpdateSchema
>;

function normalizePhoneInput(value: string) {
  return value.replace(/[\s()-]/g, "");
}

function isSriLankanMobile(value: string) {
  return /^(?:\+94|94|0)7\d{8}$/.test(value);
}

function isSriLankanPhone(value: string) {
  return /^(?:\+94|94|0)\d{9}$/.test(value);
}

function toInternationalPhone(value: string) {
  if (value.startsWith("+94")) {
    return value;
  }

  if (value.startsWith("94")) {
    return `+${value}`;
  }

  return `+94${value.slice(1)}`;
}
