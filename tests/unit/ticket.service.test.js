// Week 4: getAllTickets and getTicketById both take a second `viewer`
// argument now, and getTicketById moved from findUnique to findFirst so it
// can add the same role-based scoping getAllTickets already applies (see
// scopeForViewer in src/services/ticket.service.js) — everything else
// about this file (mocking the shared Prisma client via
// jest.unstable_mockModule + a dynamic import) is unchanged from Week 2/3.
import { jest } from '@jest/globals';
import domainEvents, { EVENTS } from '../../src/events/emitter.js';

const mockPrisma = {
  ticket: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: mockPrisma,
}));

const { getAllTickets, getTicketById, createTicket, updateTicket, deleteTicket, escalateOverdueTickets } =
  await import('../../src/services/ticket.service.js');

const listOptions = { sortBy: 'createdAt', order: 'desc', page: 1, pageSize: 10 };

const customer = { id: 13, role: 'customer' };
const agent = { id: 14, role: 'agent' };
const admin = { id: 99, role: 'admin' };

describe('ticket.service', () => {
  let emitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    emitSpy = jest.spyOn(domainEvents, 'emit');
  });

  it('getAllTickets returns whatever Prisma finds, plus the total count', async () => {
    const seeded = [{ id: 1, subject: 'Cannot log in' }];
    mockPrisma.ticket.findMany.mockResolvedValue(seeded);
    mockPrisma.ticket.count.mockResolvedValue(1);

    const result = await getAllTickets(listOptions, admin);

    expect(result).toEqual({ tickets: seeded, total: 1 });
  });

  it('getAllTickets scopes a customer to their own tickets only', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getAllTickets(listOptions, customer);

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 13 } }),
    );
  });

  it('getAllTickets scopes an agent to their assigned queue plus the unassigned queue', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getAllTickets(listOptions, agent);

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ assignedAgentId: 14 }, { assignedAgentId: null }] },
      }),
    );
  });

  it('getAllTickets applies no scope at all for an admin', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getAllTickets(listOptions, admin);

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('getAllTickets combines the role scope with a status filter', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getAllTickets({ ...listOptions, status: 'open' }, customer);

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 13, status: 'open' } }),
    );
  });

  it('getAllTickets sorts and paginates using the given options', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getAllTickets({ sortBy: 'subject', order: 'asc', page: 3, pageSize: 5 }, admin);

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { subject: 'asc' },
        skip: 10, // (page 3 - 1) * pageSize 5
        take: 5,
      }),
    );
  });

  it('getTicketById looks up a ticket by id, scoped to the viewer', async () => {
    const ticket = { id: 1, subject: 'Cannot log in' };
    mockPrisma.ticket.findFirst.mockResolvedValue(ticket);

    const result = await getTicketById(1, customer);

    expect(result).toBe(ticket);
    expect(mockPrisma.ticket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, customerId: 13 } }),
    );
  });

  it('getTicketById returns null for a ticket outside the viewer\'s scope', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue(null);

    const result = await getTicketById(1, customer);

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
    const previous = { id: 1, status: 'open', assignedAgentId: null };
    const updated = { id: 1, subject: 'Cannot log in', status: 'resolved', assignedAgentId: null };
    mockPrisma.ticket.update.mockResolvedValue(updated);

    const ticket = await updateTicket(1, { status: 'resolved' }, previous);

    expect(ticket).toBe(updated);
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { status: 'resolved' } }),
    );
  });

  it('updateTicket emits ticket.assigned when a new agent is assigned', async () => {
    const previous = { id: 1, status: 'open', assignedAgentId: null };
    const updated = { id: 1, status: 'open', assignedAgentId: 14 };
    mockPrisma.ticket.update.mockResolvedValue(updated);

    await updateTicket(1, { assignedAgentId: 14 }, previous);

    expect(emitSpy).toHaveBeenCalledWith(EVENTS.TICKET_ASSIGNED, updated);
  });

  it('updateTicket does not emit ticket.assigned when re-saving the same agent', async () => {
    const previous = { id: 1, status: 'open', assignedAgentId: 14 };
    const updated = { id: 1, status: 'in_progress', assignedAgentId: 14 };
    mockPrisma.ticket.update.mockResolvedValue(updated);

    await updateTicket(1, { status: 'in_progress' }, previous);

    expect(emitSpy).not.toHaveBeenCalledWith(EVENTS.TICKET_ASSIGNED, expect.anything());
  });

  it('updateTicket does not emit ticket.assigned when un-assigning', async () => {
    const previous = { id: 1, status: 'open', assignedAgentId: 14 };
    const updated = { id: 1, status: 'open', assignedAgentId: null };
    mockPrisma.ticket.update.mockResolvedValue(updated);

    await updateTicket(1, { assignedAgentId: null }, previous);

    expect(emitSpy).not.toHaveBeenCalledWith(EVENTS.TICKET_ASSIGNED, expect.anything());
  });

  it('updateTicket emits ticket.status_changed with the previous status when status changes', async () => {
    const previous = { id: 1, status: 'open', assignedAgentId: null };
    const updated = { id: 1, status: 'resolved', assignedAgentId: null };
    mockPrisma.ticket.update.mockResolvedValue(updated);

    await updateTicket(1, { status: 'resolved' }, previous);

    expect(emitSpy).toHaveBeenCalledWith(EVENTS.TICKET_STATUS_CHANGED, updated, 'open');
  });

  it('updateTicket does not emit ticket.status_changed when status is unchanged', async () => {
    const previous = { id: 1, status: 'open', assignedAgentId: null };
    const updated = { id: 1, status: 'open', assignedAgentId: 14 };
    mockPrisma.ticket.update.mockResolvedValue(updated);

    await updateTicket(1, { assignedAgentId: 14 }, previous);

    expect(emitSpy).not.toHaveBeenCalledWith(EVENTS.TICKET_STATUS_CHANGED, expect.anything(), expect.anything());
  });

  it('deleteTicket deletes by id', async () => {
    mockPrisma.ticket.delete.mockResolvedValue({ id: 1 });

    await deleteTicket(1);

    expect(mockPrisma.ticket.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  // Week 6: called by jobs/slaScan.job.js, never by a controller — see that
  // file and this function's own comment in src/services/ticket.service.js.
  describe('escalateOverdueTickets', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-10T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('only looks for open tickets past the threshold that have not already been escalated', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      await escalateOverdueTickets(24);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: {
          status: 'open',
          createdAt: { lte: new Date('2026-01-09T12:00:00Z') },
          slaBreachedAt: null,
        },
        select: { id: true },
      });
    });

    it('marks every matching ticket breached and emits ticket.sla_breached for each', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const updated1 = { id: 1, subject: 'Overdue A', assignedAgentId: 14 };
      const updated2 = { id: 2, subject: 'Overdue B', assignedAgentId: null };
      mockPrisma.ticket.update.mockResolvedValueOnce(updated1).mockResolvedValueOnce(updated2);

      const count = await escalateOverdueTickets(24);

      expect(count).toBe(2);
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { slaBreachedAt: new Date() } }),
      );
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.TICKET_SLA_BREACHED, updated1);
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.TICKET_SLA_BREACHED, updated2);
    });

    it('does nothing when no ticket is overdue', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const count = await escalateOverdueTickets(24);

      expect(count).toBe(0);
      expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalledWith(EVENTS.TICKET_SLA_BREACHED, expect.anything());
    });
  });
});
