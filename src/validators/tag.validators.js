import { z } from 'zod';

export const tagIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(50),
});

// A tag has exactly one field worth changing, so update and create share the
// same shape — unlike Ticket/Comment there's no smaller subset of fields
// that would make a separate "partial" schema mean anything different.
export const updateTagSchema = createTagSchema;
