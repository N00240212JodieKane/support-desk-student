// A preview of the unit-testing habit that becomes a running part of every
// week from Week 3 onward (see PLAN.md's "Key decisions"). Nothing here needs
// Prisma or Zod yet — `ticket.service.js` is already plain, dependency-free
// functions over an in-memory array, so it's testable exactly as it stands.
import {
  getAllTickets,
  getTicketById,
  createTicket,
} from '../../src/services/ticket.service.js';

describe('ticket.service', () => {
  it('getAllTickets returns the seeded tickets', async () => {
    const tickets = await getAllTickets();

    expect(tickets.length).toBeGreaterThanOrEqual(2);
  });

  it('getTicketById finds an existing ticket', async () => {
    const ticket = await getTicketById(1);

    expect(ticket).toMatchObject({ id: 1, subject: 'Cannot log in' });
  });

  it('getTicketById returns undefined for an unknown id', async () => {
    const ticket = await getTicketById(999);

    expect(ticket).toBeUndefined();
  });

  it('createTicket adds a new ticket with status "open"', async () => {
    const ticket = await createTicket({
      subject: 'New issue',
      description: 'Details',
    });

    expect(ticket).toMatchObject({
      subject: 'New issue',
      description: 'Details',
      status: 'open',
    });
    expect(ticket.id).toBeDefined();

    const tickets = await getAllTickets();
    expect(tickets).toContainEqual(ticket);
  });
});
