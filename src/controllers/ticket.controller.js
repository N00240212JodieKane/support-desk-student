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
  const ticket = await ticketService.getTicketById(id);

  if (!ticket) {
    return res.status(404).json({ error: { message: `Ticket ${id} not found` } });
  }

  res.json(ticket);
});

export const createTicket = asyncHandler(async (req, res) => {
  const { subject, description } = req.body;

  if (!subject || !description) {
    return res
      .status(400)
      .json({ error: { message: 'subject and description are required' } });
  }

  const ticket = await ticketService.createTicket({ subject, description });
  res.status(201).json(ticket);
});
