import { z } from 'zod';

// Kept in sync by hand with the `TicketStatus` enum in prisma/schema.prisma —
// Zod has no way to read a Prisma schema at validation time, so this list
// has to be maintained alongside it.
const statusEnum = z.enum(['open', 'in_progress', 'resolved', 'closed']);

// `z.coerce.number()` matters here specifically because this schema runs
// against `req.params`, and every Express route param arrives as a string
// (`/tickets/7` → `req.params.id === '7'`) — coerce converts it to a real
// number before anything downstream (the service, Prisma) sees it.
export const ticketIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1, 'subject is required').max(200),
  description: z.string().trim().min(1, 'description is required'),
  // Still a plain body field, standing in for the authenticated customer
  // until Week 4's auth replaces it with req.user.id (see CLAUDE.md).
  customerId: z.coerce.number().int().positive(),
});

// Every field optional — this is PATCH's "change only what you send", not
// PUT's "replace the whole resource" — but at least one has to be present,
// or the request did nothing.
export const updateTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).optional(),
    status: statusEnum.optional(),
    assignedAgentId: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'at least one field must be provided',
  });

// GET /tickets?status=open&sortBy=createdAt&order=desc&page=1&pageSize=10 —
// every field optional with a default, since a bare `GET /tickets` is a
// valid request on its own.
export const listTicketsQuerySchema = z.object({
  status: statusEnum.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'subject', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
