import { z } from "zod";
import { LEAD_STATUSES } from "../models/lead";

const phoneRegex = /^\+?[0-9\s-]{7,20}$/;

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email address")),
  phone: z.string().trim().regex(phoneRegex, "Invalid phone number"),
  status: z.enum(LEAD_STATUSES).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export const listLeadsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
