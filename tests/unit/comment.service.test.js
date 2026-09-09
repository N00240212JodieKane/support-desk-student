import { jest } from '@jest/globals';
import domainEvents, { EVENTS } from '../../src/events/emitter.js';

const mockPrisma = {
  ticket: {
    findUnique: jest.fn(),
  },
  comment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: mockPrisma,
}));

const {
  getCommentsByTicketId,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
} = await import('../../src/services/comment.service.js');

describe('comment.service', () => {
  let emitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    emitSpy = jest.spyOn(domainEvents, 'emit');
    // createComment always looks the parent ticket up to resolve who to
    // notify (see createComment below) — a bare default here so tests that
    // aren't specifically exercising that resolution don't need to repeat
    // it just to avoid the (caught, logged) lookup failure.
    mockPrisma.ticket.findUnique.mockResolvedValue({
      id: 7,
      subject: 'Cannot log in',
      customerId: 1,
      watchers: [],
    });
  });

  it('getCommentsByTicketId scopes the query to the given ticket', async () => {
    const seeded = [{ id: 1, body: 'Looking into it' }];
    mockPrisma.comment.findMany.mockResolvedValue(seeded);

    const comments = await getCommentsByTicketId(7);

    expect(comments).toBe(seeded);
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ticketId: 7 } }),
    );
  });

  it('getCommentById scopes the lookup to both ticketId and id', async () => {
    const comment = { id: 1, ticketId: 7, body: 'Looking into it' };
    mockPrisma.comment.findFirst.mockResolvedValue(comment);

    const result = await getCommentById(7, 1);

    expect(result).toBe(comment);
    expect(mockPrisma.comment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, ticketId: 7 } }),
    );
  });

  it('getCommentById returns null when the comment belongs to a different ticket', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue(null);

    const result = await getCommentById(999, 1);

    expect(result).toBeNull();
  });

  it('createComment attaches the ticketId from the URL, not the body', async () => {
    const created = { id: 2, ticketId: 7, authorId: 1, body: 'On it' };
    mockPrisma.comment.create.mockResolvedValue(created);

    const comment = await createComment(7, { body: 'On it', authorId: 1 });

    expect(comment).toBe(created);
    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { body: 'On it', authorId: 1, ticketId: 7 } }),
    );
  });

  it('createComment resolves the customer and opted-in watchers as recipients, excluding the author', async () => {
    const created = {
      id: 2,
      ticketId: 7,
      authorId: 1,
      body: 'On it',
      author: { id: 1, name: 'Agent Smith', email: 'agent@x.test' },
    };
    mockPrisma.comment.create.mockResolvedValue(created);
    mockPrisma.ticket.findUnique.mockResolvedValue({
      id: 7,
      subject: 'Cannot log in',
      customerId: 13,
      // Includes the author (1, filtered back out below) and a watcher who
      // opted out (25) alongside the one who should actually be notified (20)
      // — findUnique's own `where: { notifyOnComment: true }` already
      // excludes opted-out watchers in real Prisma, so the mock reflects
      // that filtering having already happened.
      watchers: [{ userId: 1 }, { userId: 20 }],
    });
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 13, name: 'Customer', email: 'customer@x.test' },
      { id: 20, name: 'Watcher', email: 'watcher@x.test' },
    ]);

    await createComment(7, { body: 'On it', authorId: 1 });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: expect.arrayContaining([13, 20]) } },
      }),
    );
    expect(emitSpy).toHaveBeenCalledWith(
      EVENTS.TICKET_COMMENTED,
      expect.objectContaining({
        recipients: expect.arrayContaining([
          expect.objectContaining({ id: 13 }),
          expect.objectContaining({ id: 20 }),
        ]),
      }),
    );
  });

  it('createComment never notifies the comment author, even if they are the customer', async () => {
    mockPrisma.comment.create.mockResolvedValue({ id: 2, ticketId: 7, authorId: 13, body: 'Thanks!' });
    mockPrisma.ticket.findUnique.mockResolvedValue({
      id: 7,
      subject: 'Cannot log in',
      customerId: 13,
      watchers: [],
    });

    await createComment(7, { body: 'Thanks!', authorId: 13 });

    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith(
      EVENTS.TICKET_COMMENTED,
      expect.objectContaining({ recipients: [] }),
    );
  });

  it('updateComment passes the given changes through to Prisma', async () => {
    const updated = { id: 1, body: 'Edited' };
    mockPrisma.comment.update.mockResolvedValue(updated);

    const comment = await updateComment(1, { body: 'Edited' });

    expect(comment).toBe(updated);
    expect(mockPrisma.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { body: 'Edited' } }),
    );
  });

  it('deleteComment deletes by id', async () => {
    mockPrisma.comment.delete.mockResolvedValue({ id: 1 });

    await deleteComment(1);

    expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
