import { z } from 'zod';

// Comments are nested under a ticket (routes/comment.routes.js is mounted at
// /tickets/:ticketId/comments), so every comment route has a :ticketId param
// even where it has no :id of its own (the list/create routes).
export const ticketIdParamSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
});

// The item routes (get/update/delete one comment) carry both params.
export const commentIdParamsSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'body is required'),
  // Same stand-in as Ticket's customerId until Week 4's auth (see CLAUDE.md).
  authorId: z.coerce.number().int().positive(),
});

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1, 'body is required'),
});
