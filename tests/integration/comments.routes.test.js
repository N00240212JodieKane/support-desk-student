// Nested-resource routing: every request here goes through
// /tickets/:ticketId/comments..., so these also exercise mergeParams and the
// "the parent ticket must exist, and be in scope" check in
// comment.controller.js. Week 4 adds real Bearer tokens (see
// tickets.routes.test.js) and the comment-ownership rule on update/delete.
import { jest } from '@jest/globals';
import request from 'supertest';
import { signToken } from '../../src/utils/jwt.js';

const mockPrisma = {
  ticket: {
    findFirst: jest.fn(),
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

const { default: app } = await import('../../src/app.js');

const customerToken = signToken({ sub: 13, role: 'customer' });
const agentToken = signToken({ sub: 14, role: 'agent' });

const asCustomer = (req) => req.set('Authorization', `Bearer ${customerToken}`);
const asAgent = (req) => req.set('Authorization', `Bearer ${agentToken}`);

describe('/tickets/:ticketId/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.ticket.findFirst.mockResolvedValue({ id: 1, subject: 'Cannot log in' });
    // createComment looks the ticket up again (by a different shape) to
    // resolve who to notify — see comment.service.js's createComment.
    mockPrisma.ticket.findUnique.mockResolvedValue({
      id: 1,
      subject: 'Cannot log in',
      customerId: 13,
      watchers: [],
    });
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 13, name: 'Customer', email: 'customer@x.test' },
    ]);
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/tickets/1/comments');

    expect(res.status).toBe(401);
    expect(mockPrisma.ticket.findFirst).not.toHaveBeenCalled();
  });

  it('GET .../comments 404s when the parent ticket doesn\'t exist, or isn\'t in scope', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue(null);

    const res = await asCustomer(request(app).get('/tickets/999/comments'));

    expect(res.status).toBe(404);
    expect(mockPrisma.comment.findMany).not.toHaveBeenCalled();
  });

  it('GET .../comments returns the ticket\'s comments', async () => {
    mockPrisma.comment.findMany.mockResolvedValue([{ id: 1, body: 'Looking into it' }]);

    const res = await asCustomer(request(app).get('/tickets/1/comments'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ticketId: 1 } }),
    );
  });

  it('POST .../comments attaches the authenticated user as the author', async () => {
    mockPrisma.comment.create.mockResolvedValue({ id: 2, ticketId: 1, authorId: 14, body: 'On it' });

    const res = await asAgent(request(app).post('/tickets/1/comments').send({ body: 'On it' }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ body: 'On it' });
    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { body: 'On it', authorId: 14, ticketId: 1 } }),
    );
  });

  it('POST .../comments ignores an authorId supplied in the body', async () => {
    mockPrisma.comment.create.mockResolvedValue({ id: 2, ticketId: 1, authorId: 14 });

    await asAgent(request(app).post('/tickets/1/comments').send({ body: 'On it', authorId: 999 }));

    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorId: 14 }) }),
    );
  });

  it('POST .../comments with an empty body returns 400', async () => {
    const res = await asCustomer(request(app).post('/tickets/1/comments').send({ body: '' }));

    expect(res.status).toBe(400);
    expect(mockPrisma.comment.create).not.toHaveBeenCalled();
  });

  it('PATCH .../comments/:id 404s when the comment is on a different ticket', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue(null);

    const res = await asAgent(request(app).patch('/tickets/1/comments/9').send({ body: 'Edited' }));

    expect(res.status).toBe(404);
    expect(mockPrisma.comment.update).not.toHaveBeenCalled();
  });

  it('PATCH .../comments/:id is forbidden when the caller isn\'t the comment\'s author', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue({ id: 9, ticketId: 1, authorId: 14 });

    const res = await asCustomer(request(app).patch('/tickets/1/comments/9').send({ body: 'Hijacked' }));

    expect(res.status).toBe(403);
    expect(mockPrisma.comment.update).not.toHaveBeenCalled();
  });

  it('PATCH .../comments/:id succeeds for the comment\'s own author', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue({ id: 9, ticketId: 1, authorId: 14 });
    mockPrisma.comment.update.mockResolvedValue({ id: 9, ticketId: 1, authorId: 14, body: 'Edited' });

    const res = await asAgent(request(app).patch('/tickets/1/comments/9').send({ body: 'Edited' }));

    expect(res.status).toBe(200);
    expect(res.body.data.body).toBe('Edited');
  });

  it('DELETE .../comments/:id removes an existing comment and returns 204', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue({ id: 9, ticketId: 1, authorId: 14 });
    mockPrisma.comment.delete.mockResolvedValue({ id: 9 });

    const res = await asAgent(request(app).delete('/tickets/1/comments/9'));

    expect(res.status).toBe(204);
    expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 9 } });
  });
});
