import { jest } from '@jest/globals';

const mockPrisma = {
  comment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
  beforeEach(() => {
    jest.clearAllMocks();
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
