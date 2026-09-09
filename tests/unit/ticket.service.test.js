// Week 2: ticket.service.js now talks to Prisma/MySQL instead of an
// in-memory array, so these unit tests mock the shared `db.js` Prisma client
// (src/config/db.js) rather than hitting a real database — a full DB-backed
// testing story (test databases, fixtures, resets) is more machinery than
// this week needs; endpoint/integration tests against a real app arrive in
// Week 6 (see PLAN.md's "Key decisions").
//
// This project runs Jest natively over ESM (no Babel transform — see the
// `test` script in package.json), so mocking a module means
// `jest.unstable_mockModule()` followed by a dynamic `import()` of the code
// under test, rather than the familiar CommonJS `jest.mock()` + static
// import — the mock has to be registered before the module that uses it is
// ever loaded.
import { jest } from '@jest/globals';

const mockPrisma = {
  ticket: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: mockPrisma,
}));

const { getAllTickets, getTicketById, createTicket } = await import(
  '../../src/services/ticket.service.js'
);

describe('ticket.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAllTickets returns whatever Prisma finds', async () => {
    const seeded = [{ id: 1, subject: 'Cannot log in' }];
    mockPrisma.ticket.findMany.mockResolvedValue(seeded);

    const tickets = await getAllTickets();

    expect(tickets).toBe(seeded);
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledTimes(1);
  });

  it('getTicketById looks up a ticket by id', async () => {
    const ticket = { id: 1, subject: 'Cannot log in' };
    mockPrisma.ticket.findUnique.mockResolvedValue(ticket);

    const result = await getTicketById(1);

    expect(result).toBe(ticket);
    expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it('getTicketById returns null for an unknown id', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    const result = await getTicketById(999);

    expect(result).toBeNull();
  });

  it('createTicket passes subject/description/customerId through to Prisma', async () => {
    const created = {
      id: 3,
      subject: 'New issue',
      description: 'Details',
      status: 'open',
      customerId: 1,
    };
    mockPrisma.ticket.create.mockResolvedValue(created);

    const ticket = await createTicket({
      subject: 'New issue',
      description: 'Details',
      customerId: 1,
    });

    expect(ticket).toBe(created);
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { subject: 'New issue', description: 'Details', customerId: 1 },
      }),
    );
  });
});
