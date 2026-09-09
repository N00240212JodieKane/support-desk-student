// Comments always belong to exactly one ticket (see CLAUDE.md's domain
// section), so every query here is scoped by ticketId — not just because
// that's how the nested route reads, but so a request for
// /tickets/1/comments/9 can't touch comment 9 if it actually belongs to a
// different ticket.
import prisma from '../config/db.js';

const authorSummary = { select: { id: true, name: true, email: true } };

export const getCommentsByTicketId = async (ticketId) =>
  prisma.comment.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    include: { author: authorSummary },
  });

// findFirst, not findUnique — id alone is the real primary key, but scoping
// the where clause to ticketId too is what stops a mismatched ticketId/id
// pair in the URL from ever resolving to a comment on the wrong ticket.
export const getCommentById = async (ticketId, id) =>
  prisma.comment.findFirst({
    where: { id, ticketId },
    include: { author: authorSummary },
  });

export const createComment = async (ticketId, { body, authorId }) =>
  prisma.comment.create({
    data: { body, authorId, ticketId },
    include: { author: authorSummary },
  });

// The controller already ran a scoped getCommentById to confirm this
// comment both exists and belongs to this ticket before calling either of
// these — same "read before write" pattern as ticket.service.js.
export const updateComment = async (id, changes) =>
  prisma.comment.update({
    where: { id },
    data: changes,
    include: { author: authorSummary },
  });

export const deleteComment = async (id) => prisma.comment.delete({ where: { id } });
