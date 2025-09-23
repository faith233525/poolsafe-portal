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
  userPass: z.string().optional(),
  userEmail: z.string().email().optional(),
});

export const partnerUpdateSchema = partnerCreateSchema.partial();

export const partnerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25).optional(),
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
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25).optional(),
});

export const ticketStatusChangeSchema = z.object({
  status: z.enum(ticketStatusValues as [string, ...string[]]),
  internalNotes: z.string().optional(),
  resolutionTime: z.number().int().min(0).optional(),
});

// Service Records
export const serviceRecordCreateSchema = z.object({
  partnerId: z.string().uuid(),
  assignedToId: z.string().uuid().optional(),
  serviceType: z.string().min(2),
  description: z.string().optional(),
  notes: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  attachments: z.array(z.any()).optional(),
});
export const serviceRecordUpdateSchema = serviceRecordCreateSchema.partial().extend({
  completedDate: z.string().datetime().optional(),
  status: z.string().optional(),
});

export const serviceRecordListQuerySchema = z.object({
  partnerId: z.string().uuid().optional(),
  serviceType: z.string().optional(),
  status: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25).optional(),
});

// Calendar Events
export const calendarEventCreateSchema = z.object({
  partnerId: z.string().uuid(),
  createdById: z.string().uuid().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  eventType: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  reminderMinutes: z
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 60)
    .optional(),
});
export const calendarEventUpdateSchema = calendarEventCreateSchema.partial();
export const calendarEventListQuerySchema = z.object({
  partnerId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

// Knowledge Base list/search pagination (reuse where appropriate)
export const knowledgeBaseListQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().min(2).optional(),
  published: z.enum(["true", "false", "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25).optional(),
});

// Knowledge Base create/update
export const knowledgeBaseCreateSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(1),
  category: z.string().min(2),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.any()).optional(),
  videos: z.array(z.string()).optional(),
  searchKeywords: z.string().optional(),
  isPublished: z.boolean().optional(),
});
export const knowledgeBaseUpdateSchema = knowledgeBaseCreateSchema.partial();

// Attachments
export const attachmentCreateSchema = z.object({
  filename: z.string().min(1),
  filepath: z.string().min(1),
  mimetype: z.string().min(2).optional(),
  size: z.number().int().min(0).optional(),
  ticketId: z.string().uuid(),
});

// Attachment upload (multipart) expects only ticketId in body (file handled separately)
export const attachmentUploadSchema = z.object({
  ticketId: z.string().uuid(),
});

// Notifications
export const notificationCreateSchema = z.object({
  userId: z.string().uuid().optional(),
  recipientEmail: z.string().email().optional(),
  title: z.string().min(2),
  message: z.string().min(1),
  type: z.string().min(2),
  relatedId: z.string().uuid().optional(),
  relatedType: z.enum(["TICKET", "SERVICE", "CALENDAR"]).optional(),
});

export const notificationListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  type: z.string().optional(),
  isRead: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25).optional(),
});

// Unified search query
export const unifiedSearchQuerySchema = z.object({
  q: z.string().min(2),
  includeTickets: z.enum(["true", "false"]).optional().default("true"),
  includeKnowledge: z.enum(["true", "false"]).optional().default("true"),
  ticketsPage: z.coerce.number().int().min(1).default(1).optional(),
  ticketsPageSize: z.coerce.number().int().min(1).max(50).default(10).optional(),
  kbPage: z.coerce.number().int().min(1).default(1).optional(),
  kbPageSize: z.coerce.number().int().min(1).max(50).default(10).optional(),
});
