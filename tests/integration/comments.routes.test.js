// Nested-resource routing: every request here goes through
// /tickets/:ticketId/comments..., so these also exercise mergeParams and the
// "the parent ticket must exist" check in comment.controller.js.
import { jest } from '@jest/globals';
import request from 'supertest';

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
};

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: mockPrisma,
}));

const { default: app } = await import('../../src/app.js');

describe('/tickets/:ticketId/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.ticket.findUnique.mockResolvedValue({ id: 1, subject: 'Cannot log in' });
  });

  it('GET .../comments 404s when the parent ticket does not exist', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/tickets/999/comments');

    expect(res.status).toBe(404);
    expect(mockPrisma.comment.findMany).not.toHaveBeenCalled();
  });

  it('GET .../comments returns the ticket\'s comments', async () => {
    mockPrisma.comment.findMany.mockResolvedValue([{ id: 1, body: 'Looking into it' }]);

    const res = await request(app).get('/tickets/1/comments');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ticketId: 1 } }),
    );
  });

  it('POST .../comments creates a comment scoped to the ticket', async () => {
    mockPrisma.comment.create.mockResolvedValue({ id: 2, ticketId: 1, body: 'On it' });

    const res = await request(app).post('/tickets/1/comments').send({ body: 'On it', authorId: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ body: 'On it' });
    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { body: 'On it', authorId: 2, ticketId: 1 } }),
    );
  });

  it('POST .../comments with an empty body returns 400', async () => {
    const res = await request(app).post('/tickets/1/comments').send({ body: '', authorId: 2 });

    expect(res.status).toBe(400);
    expect(mockPrisma.comment.create).not.toHaveBeenCalled();
  });

  it('PATCH .../comments/:id 404s when the comment is on a different ticket', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue(null);

    const res = await request(app).patch('/tickets/1/comments/9').send({ body: 'Edited' });

    expect(res.status).toBe(404);
    expect(mockPrisma.comment.update).not.toHaveBeenCalled();
  });

  it('DELETE .../comments/:id removes an existing comment and returns 204', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue({ id: 9, ticketId: 1 });
    mockPrisma.comment.delete.mockResolvedValue({ id: 9 });

    const res = await request(app).delete('/tickets/1/comments/9');

    expect(res.status).toBe(204);
    expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 9 } });
  });
});
