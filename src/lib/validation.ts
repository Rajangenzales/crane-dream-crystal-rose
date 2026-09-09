import { z } from "zod";
import { ACTIVITY_STATUSES, ACTIVITY_UNITS, PAYMENT_STATUSES } from "./catalog.ts";

const MAX_SHORT = 200;
const MAX_MEDIUM = 2_000;
const MAX_LONG = 8_000;
const MAX_PASSWORD = 200;
const MAX_IDS = 200;

const activityStatusValues = ACTIVITY_STATUSES.map((s) => s.value) as [string, ...string[]];
const paymentStatusValues = PAYMENT_STATUSES.map((s) => s.value) as [string, ...string[]];
const unitValues = [...ACTIVITY_UNITS] as [string, ...string[]];

export const idSchema = z.string().trim().min(1).max(80);
export const optionalIdSchema = z.string().trim().max(80).optional();
export const nameSchema = z.string().trim().min(1).max(MAX_SHORT);
export const shortTextSchema = z.string().trim().max(MAX_SHORT);
export const mediumTextSchema = z.string().trim().max(MAX_MEDIUM);
export const longTextSchema = z.string().trim().max(MAX_LONG);
export const roleSchema = z.enum(["admin", "viewer"]);
export const yearSchema = z.number().int().min(2000).max(2100);
export const monthSchema = z.number().int().min(1).max(12);
export const moneySchema = z.number().finite().min(0).max(1_000_000_000).nullable().optional();
export const quantitySchema = z.number().finite().min(0).max(1_000_000).nullable().optional();
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .nullable()
  .optional();
export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Invalid email");
export const phoneSchema = z.string().trim().max(40);
export const passwordSchema = z.string().min(8).max(MAX_PASSWORD);
export const activityStatusSchema = z.enum(activityStatusValues);
export const paymentStatusSchema = z.enum(paymentStatusValues);
export const unitSchema = z.enum(unitValues);

export const yearMonthSchema = z.object({
  year: yearSchema,
  month: monthSchema,
});

export const includeInactiveSchema = z
  .object({ includeInactive: z.boolean().optional() })
  .optional()
  .transform((d) => d ?? {});

export const updateSettingsSchema = z.object({
  agencyName: z.string().trim().min(1).max(200),
  agencyTagline: shortTextSchema,
  currency: z.string().trim().min(1).max(8),
  viewersSeePayments: z.boolean(),
});

export const createClientSchema = z.object({
  name: nameSchema,
  companyName: shortTextSchema.optional(),
  contactPerson: shortTextSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  notes: longTextSchema.optional(),
});

export const updateClientSchema = createClientSchema.extend({
  id: idSchema,
  isActive: z.boolean().optional(),
});

export const createServiceSchema = z.object({
  name: nameSchema,
  isGlobal: z.boolean().optional(),
});

export const updateServiceSchema = z.object({
  id: idSchema,
  name: nameSchema,
  isActive: z.boolean(),
});

export const assignClientServiceSchema = z.object({
  clientId: idSchema,
  serviceId: optionalIdSchema,
  customName: shortTextSchema.optional(),
  promote: z.boolean().optional(),
});

export const unassignClientServiceSchema = z.object({
  clientId: idSchema,
  serviceId: idSchema,
});

export const workspaceQuerySchema = z.object({
  clientId: idSchema,
  year: yearSchema,
  month: monthSchema,
});

export const addSectionSchema = z.object({
  periodId: idSchema,
  title: nameSchema,
  serviceId: z.string().trim().max(80).nullable().optional(),
});

export const updateSectionSchema = z.object({
  id: idSchema,
  title: nameSchema,
});

export const idOnlySchema = z.object({ id: idSchema });

export const reorderSectionsSchema = z.object({
  ids: z.array(idSchema).min(1).max(MAX_IDS),
});

export const saveActivitySchema = z.object({
  id: optionalIdSchema,
  sectionId: idSchema,
  activityDate: isoDateSchema,
  title: nameSchema,
  description: mediumTextSchema.optional(),
  quantity: quantitySchema,
  unit: z.string().trim().max(40).optional(),
  status: activityStatusSchema,
  notes: mediumTextSchema.optional(),
});

export const duplicatePeriodSchema = z.object({
  clientId: idSchema,
  fromYear: yearSchema,
  fromMonth: monthSchema,
  toYear: yearSchema,
  toMonth: monthSchema,
});

export const savePaymentSchema = z.object({
  id: optionalIdSchema,
  clientId: idSchema,
  year: yearSchema,
  month: monthSchema,
  periodId: z.string().trim().max(80).nullable().optional(),
  status: paymentStatusSchema,
  amount: moneySchema,
  paymentDate: isoDateSchema,
  notes: mediumTextSchema.optional(),
});

export const clientReportSchema = workspaceQuerySchema;

export const combinedReportSchema = z.object({
  clientIds: z.array(idSchema).min(1).max(MAX_IDS),
  year: yearSchema,
  month: monthSchema,
});

export const updateUserAccessSchema = z.object({
  userId: idSchema,
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
});

export const createEmailUserSchema = z.object({
  name: nameSchema,
  email: z
    .string()
    .trim()
    .min(3)
    .max(254)
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Invalid email"),
  password: passwordSchema,
  role: roleSchema,
});

export const createBackupSchema = z
  .object({ note: shortTextSchema.optional() })
  .optional()
  .transform((d) => d ?? {});

export const restoreBackupSchema = z
  .object({
    id: optionalIdSchema,
    payload: z.unknown().optional(),
  })
  .refine((d) => Boolean(d.id) || d.payload !== undefined, {
    message: "Provide a backup id or payload.",
  });

export function parseInput<T>(schema: z.ZodType<T>) {
  return (data: unknown) => schema.parse(data);
}
