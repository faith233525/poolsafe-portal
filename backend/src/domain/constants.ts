export const ROLES = {
  PARTNER: "PARTNER",
  SUPPORT: "SUPPORT",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TICKET_STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
} as const;
export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

export const TICKET_CATEGORIES = [
  "Call Button",
  "Charging",
  "Connectivity",
  "Screen",
  "Locking",
  "General Maintenance",
  "Monitor",
  "Antenna",
  "Gateway",
  "LoRa",
  "General System",
  "Other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export function isRole(value: any): value is Role {
  return Object.values(ROLES).includes(value);
}
export function isTicketStatus(value: any): value is TicketStatus {
  return Object.values(TICKET_STATUS).includes(value);
}
export function isTicketPriority(value: any): value is TicketPriority {
  return Object.values(TICKET_PRIORITY).includes(value);
}
