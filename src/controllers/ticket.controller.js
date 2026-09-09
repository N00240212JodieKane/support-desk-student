import * as ticketService from '../services/ticket.service.js';
import asyncHandler from '../middleware/asyncHandler.js';

// Real request validation (Zod) arrives in Week 3 — see PLAN.md. For now this
// is a plain manual check so the endpoint doesn't just trust the body blindly.

export const getAllTickets = asyncHandler(async (req, res) => {
  const tickets = await ticketService.getAllTickets();
  res.json(tickets);
});

export const getTicketById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: { message: 'id must be a number' } });
  }

  const ticket = await ticketService.getTicketById(id);

  if (!ticket) {
    return res.status(404).json({ error: { message: `Ticket ${id} not found` } });
  }

  res.json(ticket);
});

export const createTicket = asyncHandler(async (req, res) => {
  const { subject, description, customerId } = req.body;

  // customerId is a plain body field for now, stood in for the authenticated
  // customer until Week 4's auth replaces it with req.user.id.
  if (!subject || !description || !customerId) {
    return res
      .status(400)
      .json({ error: { message: 'subject, description and customerId are required' } });
  }

  const ticket = await ticketService.createTicket({
    subject,
    description,
    customerId: Number(customerId),
  });
  res.status(201).json(ticket);
});
