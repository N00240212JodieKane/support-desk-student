// Week 1: an in-memory array stands in for the database, so the API shape
// (routes, controllers, request/response flow) can be built before Prisma +
// MySQL are introduced in Week 2. Functions are already `async` even though
// nothing here awaits anything yet — that's deliberate, so the controller
// layer above doesn't have to change shape once these become real DB calls.
let tickets = [
  {
    id: 1,
    subject: 'Cannot log in',
    description: 'Password reset email never arrives',
    status: 'open',
  },
  {
    id: 2,
    subject: 'Invoice discrepancy',
    description: 'Charged twice for March',
    status: 'open',
  },
];
let nextId = tickets.length + 1;

export const getAllTickets = async () => tickets;

export const getTicketById = async (id) => tickets.find((ticket) => ticket.id === id);

export const createTicket = async ({ subject, description }) => {
  const ticket = { id: nextId++, subject, description, status: 'open' };
  tickets.push(ticket);
  return ticket;
};
