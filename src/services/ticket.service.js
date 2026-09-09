// Week 2: swaps the in-memory array from Week 1 for Prisma-backed MySQL
// queries. Function signatures are unchanged from Week 1, so the controller
// layer above didn't need to change shape — only what's inside these
// functions changed, which was the point of keeping them `async` from the
// start (see CLAUDE.md).
import prisma from '../config/db.js';

// A minimal, password-free shape for the user relations below — nothing
// controller-facing should ever see the password column.
const userSummary = { select: { id: true, name: true, email: true } };

export const getAllTickets = async () =>
  prisma.ticket.findMany({
    orderBy: { id: 'asc' },
    include: {
      customer: userSummary,
      assignedAgent: userSummary,
    },
  });

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
