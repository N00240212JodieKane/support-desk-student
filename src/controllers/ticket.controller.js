// Week 3: manual body/param checks (Week 1/2) are gone — validate.js
// (applied per-route in ticket.routes.js) rejects a bad request before it
// ever reaches these functions, so every controller here can trust
// req.body/req.params/req.query are already the right shape.
import * as ticketService from '../services/ticket.service.js';
import asyncHandler from '../middleware/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendResource, sendCollection } from '../utils/response.js';

export const getAllTickets = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const { tickets, total } = await ticketService.getAllTickets(req.query);

  sendCollection(res, tickets, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicketById(req.params.id);

  if (!ticket) {
    throw new ApiError(404, `Ticket ${req.params.id} not found`);
  }

  sendResource(res, ticket);
});

export const createTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.createTicket(req.body);
  sendResource(res, ticket, 201);
});

// Reads the ticket first, purely to turn "update a ticket that doesn't
// exist" into a clean 404 — Prisma's own `update` would instead reject with
// its own "record not found" error, which isn't the shape errorHandler.js
// expects. The extra query is a small, deliberate trade for that.
export const updateTicket = asyncHandler(async (req, res) => {
  const existing = await ticketService.getTicketById(req.params.id);

  if (!existing) {
    throw new ApiError(404, `Ticket ${req.params.id} not found`);
  }

  const ticket = await ticketService.updateTicket(req.params.id, req.body);
  sendResource(res, ticket);
});

export const deleteTicket = asyncHandler(async (req, res) => {
  const existing = await ticketService.getTicketById(req.params.id);

  if (!existing) {
    throw new ApiError(404, `Ticket ${req.params.id} not found`);
  }

  await ticketService.deleteTicket(req.params.id);
  res.status(204).end();
});
