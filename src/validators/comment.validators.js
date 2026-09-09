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

// authorId isn't a field here for the same reason Ticket's createTicketSchema
// dropped customerId — it comes from req.user.id, not the request body.
export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'body is required'),
});

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1, 'body is required'),
});
