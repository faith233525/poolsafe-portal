import { z } from "zod";
import { ROLES, TICKET_PRIORITY, TICKET_STATUS, TICKET_CATEGORIES } from "../domain/constants";

const roleValues = Object.values(ROLES);
const ticketStatusValues = Object.values(TICKET_STATUS);
const ticketPriorityValues = Object.values(TICKET_PRIORITY);
const ticketCategoryValues = [...TICKET_CATEGORIES];

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(100).optional(),
  role: z.enum(roleValues as [string, ...string[]]).default(ROLES.PARTNER),
  partnerId: z.string().uuid().optional(),
});

export const partnerCreateSchema = z.object({
  companyName: z.string().min(2),
  managementCompany: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  numberOfLoungeUnits: z.number().int().min(0).default(0),
  topColour: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const ticketCreateSchema = z.object({
  partnerId: z.string().uuid().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  subject: z.string().min(3),
  category: z.enum(ticketCategoryValues as [string, ...string[]]).optional(),
  description: z.string().optional(),
  unitsAffected: z.number().int().min(0).optional(),
  priority: z.enum(ticketPriorityValues as [string, ...string[]]).optional(),
  contactPreference: z.string().optional(),
  recurringIssue: z.boolean().optional(),
  dateOfOccurrence: z.string().datetime().optional(),
  severity: z.number().int().min(1).max(10).optional(),
  followUpNotes: z.string().optional(),
});

export const ticketUpdateSchema = ticketCreateSchema.partial().extend({
  status: z.enum(ticketStatusValues as [string, ...string[]]).optional(),
  internalNotes: z.string().optional(),
  resolutionTime: z.number().int().min(0).optional(),
  assignedToId: z.string().uuid().optional(),
});

export const ticketListQuerySchema = z.object({
  partnerId: z.string().uuid().optional(),
  category: z.enum(ticketCategoryValues as [string, ...string[]]).optional(),
  priority: z.enum(ticketPriorityValues as [string, ...string[]]).optional(),
  status: z.enum(ticketStatusValues as [string, ...string[]]).optional(),
  assignedToId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().min(2).optional(),
});

export const ticketStatusChangeSchema = z.object({
  status: z.enum(ticketStatusValues as [string, ...string[]]),
  internalNotes: z.string().optional(),
  resolutionTime: z.number().int().min(0).optional(),
});
