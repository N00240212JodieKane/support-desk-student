// Week 3: full CRUD, plus filtering/sorting/pagination on the list query
// (see PLAN.md). Function signatures grew (getAllTickets now takes options;
// update/delete are new) but the shape is unchanged from Week 2 — plain
// async functions wrapping Prisma calls, nothing the controller needs to
// know about beyond what it passes in and gets back.
import prisma from '../config/db.js';

// A minimal, password-free shape for the user relations below — nothing
// controller-facing should ever see the password column.
const userSummary = { select: { id: true, name: true, email: true } };

// `options` arrives already validated and defaulted by
// validators/ticket.validators.js's listTicketsQuerySchema — this function
// trusts its shape rather than re-checking it.
export const getAllTickets = async ({ status, sortBy, order, page, pageSize }) => {
  const where = status ? { status } : undefined;

  // Same `where` on both calls, so the count matches whatever the filter
  // narrowed the list down to, not the whole table — that's what makes
  // `totalPages` in the response meta mean anything.
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

export const getTicketById = async (id) =>
  prisma.ticket.findUnique({
    where: { id },
    include: {
      customer: userSummary,
      assignedAgent: userSummary,
    },
  });

export const createTicket = async ({ subject, description, customerId }) =>
  prisma.ticket.create({
    data: { subject, description, customerId },
    include: {
      customer: userSummary,
    },
  });

// The controller already confirmed the ticket exists (a getTicketById call)
// before ever reaching this — see the "read before write" note on
// ticket.controller.js — so this doesn't need to defend against a missing
// row the way createTicket doesn't either.
export const updateTicket = async (id, changes) =>
  prisma.ticket.update({
    where: { id },
    data: changes,
    include: { customer: userSummary, assignedAgent: userSummary },
  });

export const deleteTicket = async (id) => prisma.ticket.delete({ where: { id } });
