// Week 3: getAllTickets now takes a filter/sort/pagination options object and
// returns { tickets, total } instead of a bare array, and update/delete are
// new — everything else about this file (mocking the shared Prisma client
// via jest.unstable_mockModule + a dynamic import) is unchanged from Week 2
// (see content/02-data-modeling-and-persistence's testing topic for why
// that's needed on this project's native-ESM Jest setup).
import { jest } from '@jest/globals';

const mockPrisma = {
  ticket: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: mockPrisma,
}));

const { getAllTickets, getTicketById, createTicket, updateTicket, deleteTicket } = await import(
  '../../src/services/ticket.service.js'
);

const listOptions = { sortBy: 'createdAt', order: 'desc', page: 1, pageSize: 10 };

describe('ticket.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAllTickets returns whatever Prisma finds, plus the total count', async () => {
    const seeded = [{ id: 1, subject: 'Cannot log in' }];
    mockPrisma.ticket.findMany.mockResolvedValue(seeded);
    mockPrisma.ticket.count.mockResolvedValue(1);

    const result = await getAllTickets(listOptions);

    expect(result).toEqual({ tickets: seeded, total: 1 });
  });

  it('getAllTickets filters by status when one is given', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getAllTickets({ ...listOptions, status: 'open' });

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'open' } }),
    );
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: { status: 'open' } });
  });

  it('getAllTickets sorts and paginates using the given options', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getAllTickets({ sortBy: 'subject', order: 'asc', page: 3, pageSize: 5 });

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { subject: 'asc' },
        skip: 10, // (page 3 - 1) * pageSize 5
        take: 5,
      }),
    );
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

  it('updateTicket passes only the given changes through to Prisma', async () => {
    const updated = { id: 1, subject: 'Cannot log in', status: 'resolved' };
    mockPrisma.ticket.update.mockResolvedValue(updated);

    const ticket = await updateTicket(1, { status: 'resolved' });

    expect(ticket).toBe(updated);
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { status: 'resolved' } }),
    );
  });

  it('deleteTicket deletes by id', async () => {
    mockPrisma.ticket.delete.mockResolvedValue({ id: 1 });

    await deleteTicket(1);

    expect(mockPrisma.ticket.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
