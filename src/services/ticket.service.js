// Week 4: every read is now scoped by who's asking (see the role-scoped
// queries topic) — a `viewer` object ({ id, role }, straight off req.user)
// joins `options` as a second parameter on the functions that need it.
// Everything else about this file's shape is unchanged from Week 3.
import prisma from '../config/db.js';
import domainEvents, { EVENTS } from '../events/emitter.js';

// A minimal, password-free shape for the user relations below — nothing
// controller-facing should ever see the password column.
const userSummary = { select: { id: true, name: true, email: true } };

// The Prisma `where` fragment that scopes a ticket query to what `viewer`
// is actually allowed to see: a customer only ever sees their own tickets;
// an agent sees their own assigned queue plus the shared unassigned queue
// (`assignedAgentId: null`) anyone could pick up; an admin's `{}` adds no
// restriction at all. Reused by both getAllTickets (the list) and
// getTicketById (one ticket) below, so the two can never drift apart on
// what counts as "visible to this viewer."
const scopeForViewer = (viewer) => {
  if (viewer.role === 'customer') return { customerId: viewer.id };
  if (viewer.role === 'agent') {
    return { OR: [{ assignedAgentId: viewer.id }, { assignedAgentId: null }] };
  }
  return {};
};

// `options` arrives already validated and defaulted by
// validators/ticket.validators.js's listTicketsQuerySchema — this function
// trusts its shape rather than re-checking it.
export const getAllTickets = async ({ status, sortBy, order, page, pageSize }, viewer) => {
  const where = { ...scopeForViewer(viewer), ...(status ? { status } : {}) };

  // Same `where` on both calls, so the count matches whatever the filter
  // (and the viewer's own scope) narrowed the list down to, not the whole
  // table — that's what makes `totalPages` in the response meta mean
  // anything.
  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: userSummary, assignedAgent: userSummary },
    }),
    prisma.ticket.count({ where }),
  ]);

  return { tickets, total };
};

// findFirst, not findUnique — scopeForViewer can add an `OR`, which isn't
// something findUnique's where accepts alongside a plain `id`. A ticket
// that exists but falls outside `viewer`'s scope resolves to `null` here,
// exactly like one that doesn't exist at all — see the role-scoped queries
// topic for why that's deliberate, not a shortcut.
export const getTicketById = async (id, viewer) =>
  prisma.ticket.findFirst({
    where: { id, ...scopeForViewer(viewer) },
    include: {
      customer: userSummary,
      assignedAgent: userSummary,
    },
  });

export const createTicket = async ({ subject, description, customerId }) => {
  const ticket = await prisma.ticket.create({
    data: { subject, description, customerId },
    include: {
      customer: userSummary,
    },
  });

  // Fired only once the row is actually committed, carrying the same shape
  // (ticket + included customer) every listener needs — see events/emitter.js
  // and events/listeners/*.js for what "ticket.created" fans out to.
  domainEvents.emit(EVENTS.TICKET_CREATED, ticket);

  return ticket;
};

// The controller already confirmed the ticket exists *and* is in scope for
// this viewer (a getTicketById call) before ever reaching this — see the
// "read before write" note on ticket.controller.js — so this doesn't need
// to defend against a missing or out-of-scope row the way createTicket
// doesn't either. That same lookup is passed in as `previous` so the two
// events below can tell what actually *changed* — a new assignment vs.
// re-saving the same one, a real status transition vs. any other field —
// without a second query just to diff against.
export const updateTicket = async (id, changes, previous) => {
  const ticket = await prisma.ticket.update({
    where: { id },
    data: changes,
    include: { customer: userSummary, assignedAgent: userSummary },
  });

  // Only a genuine new assignment counts: not un-assigning (null) and not
  // some other field changing on an already-assigned ticket. See
  // "ticket.assigned" in CLAUDE.md's domain events.
  if (ticket.assignedAgentId !== null && ticket.assignedAgentId !== previous.assignedAgentId) {
    domainEvents.emit(EVENTS.TICKET_ASSIGNED, ticket);
  }

  if (ticket.status !== previous.status) {
    domainEvents.emit(EVENTS.TICKET_STATUS_CHANGED, ticket, previous.status);
  }

  return ticket;
};

export const deleteTicket = async (id) => prisma.ticket.delete({ where: { id } });

// Week 6: the one write path in this file that no controller ever calls —
// jobs/slaScan.job.js calls this on a schedule instead of in response to a
// request (see jobs/slaScan.queue.js). Same service layer either way: a job
// processor is just another caller, exactly like a controller.
//
// `slaBreachedAt: null` is what makes this idempotent across runs — a
// ticket already escalated on a previous scan is never matched again, even
// though it's still `open` (see the column's comment in schema.prisma).
// One update + emit per ticket, sequentially, rather than
// Promise.all/updateMany: there's normally a handful of these at most, and
// this keeps "escalate ticket A" from starting before "escalate ticket B"
// has actually committed and emitted.
export const escalateOverdueTickets = async (thresholdHours) => {
  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

  const overdue = await prisma.ticket.findMany({
    where: { status: 'open', createdAt: { lte: cutoff }, slaBreachedAt: null },
    select: { id: true },
  });

  for (const { id } of overdue) {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { slaBreachedAt: new Date() },
      include: { customer: userSummary, assignedAgent: userSummary },
    });

    domainEvents.emit(EVENTS.TICKET_SLA_BREACHED, ticket);
  }

  return overdue.length;
};
