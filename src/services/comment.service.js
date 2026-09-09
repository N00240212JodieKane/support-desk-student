// Comments always belong to exactly one ticket (see CLAUDE.md's domain
// section), so every query here is scoped by ticketId — not just because
// that's how the nested route reads, but so a request for
// /tickets/1/comments/9 can't touch comment 9 if it actually belongs to a
// different ticket.
import prisma from '../config/db.js';
import domainEvents, { EVENTS } from '../events/emitter.js';

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

export const createComment = async (ticketId, { body, authorId }) => {
  const comment = await prisma.comment.create({
    data: { body, authorId, ticketId },
    include: { author: authorSummary },
  });

  // Who to notify — the ticket's customer plus any watcher that opted into
  // comment notifications (TicketWatcher.notifyOnComment) — minus whoever
  // just wrote this comment, so nobody's notified about their own comment.
  // Resolved to full {id, name, email} rows once, here, so every listener
  // (events/listeners/*.js) can use them directly instead of each re-querying
  // for the same names/emails. See "ticket.commented" in CLAUDE.md's domain
  // events.
  //
  // Wrapped in its own try/catch: the comment above is already committed by
  // this point, so a failure resolving recipients or emitting the event
  // must never turn an already-successful comment creation into a 500 —
  // same reasoning as the try/catch inside each listener itself.
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        subject: true,
        customerId: true,
        watchers: { where: { notifyOnComment: true }, select: { userId: true } },
      },
    });

    const recipientIds = new Set([ticket.customerId, ...ticket.watchers.map((w) => w.userId)]);
    recipientIds.delete(authorId);

    const recipients = recipientIds.size
      ? await prisma.user.findMany({
          where: { id: { in: [...recipientIds] } },
          select: { id: true, name: true, email: true },
        })
      : [];

    domainEvents.emit(EVENTS.TICKET_COMMENTED, {
      comment,
      ticket: { id: ticket.id, subject: ticket.subject },
      recipients,
    });
  } catch (err) {
    console.error('createComment failed to resolve recipients/emit ticket.commented:', err);
  }

  return comment;
};

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
