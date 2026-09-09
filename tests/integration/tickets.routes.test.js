// Week 4: every route here requires a real Bearer token now — signToken
// (the same one auth.controller.js uses to issue one) generates real,
// verifiable tokens for a fake customer/agent/admin, so authenticate.js
// runs for real against them; only the Prisma client is mocked, same
// approach as Week 2/3.
import { jest } from '@jest/globals';
import request from 'supertest';
import { signToken } from '../../src/utils/jwt.js';

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

const { default: app } = await import('../../src/app.js');

const customerToken = signToken({ sub: 13, role: 'customer' });
const agentToken = signToken({ sub: 14, role: 'agent' });
const adminToken = signToken({ sub: 99, role: 'admin' });

const asCustomer = (req) => req.set('Authorization', `Bearer ${customerToken}`);
const asAgent = (req) => req.set('Authorization', `Bearer ${agentToken}`);
const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

describe('/tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a request with no Authorization header at all', async () => {
    const res = await request(app).get('/tickets');

    expect(res.status).toBe(401);
    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it('GET /tickets returns a paginated list envelope, scoped to the caller', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([
      { id: 1, subject: 'Cannot log in', status: 'open', customerId: 13 },
    ]);
    mockPrisma.ticket.count.mockResolvedValue(1);

    const res = await asCustomer(request(app).get('/tickets'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customerId: 13 }) }),
    );
  });

  it('GET /tickets?status=open filters and rejects an unknown status', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    const ok = await asAdmin(request(app).get('/tickets?status=open'));
    expect(ok.status).toBe(200);
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'open' } }),
    );

    const bad = await asAdmin(request(app).get('/tickets?status=archived'));
    expect(bad.status).toBe(400);
    expect(bad.body.error.details).toBeDefined();
  });

  it('POST /tickets creates a ticket owned by the authenticated customer', async () => {
    mockPrisma.ticket.create.mockResolvedValue({
      id: 3,
      subject: 'Cannot reset password',
      description: 'Link expired',
      status: 'open',
      customerId: 13,
    });

    const res = await asCustomer(
      request(app).post('/tickets').send({ subject: 'Cannot reset password', description: 'Link expired' }),
    );

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subject: 'Cannot reset password', status: 'open' });
    expect(mockPrisma.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customerId: 13 }) }),
    );
  });

  it('POST /tickets ignores a customerId supplied in the body', async () => {
    mockPrisma.ticket.create.mockResolvedValue({ id: 3, customerId: 13 });

    await asCustomer(
      request(app)
        .post('/tickets')
        .send({ subject: 'Cannot reset password', description: 'Link expired', customerId: 999 }),
    );

    expect(mockPrisma.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customerId: 13 }) }),
    );
  });

  it('POST /tickets is forbidden for an agent', async () => {
    const res = await asAgent(
      request(app).post('/tickets').send({ subject: 'x', description: 'y' }),
    );

    expect(res.status).toBe(403);
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  it('POST /tickets without a subject returns a 400 with validation details', async () => {
    const res = await asCustomer(
      request(app).post('/tickets').send({ description: 'Link expired' }),
    );

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'subject' })]),
    );
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  it('GET /tickets/:id returns 404 when the ticket does not exist, or is outside the caller\'s scope', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue(null);

    const res = await asCustomer(request(app).get('/tickets/999'));

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/999/);
  });

  it('GET /tickets/:id returns 400 for a non-numeric id', async () => {
    const res = await asCustomer(request(app).get('/tickets/not-a-number'));

    expect(res.status).toBe(400);
    expect(mockPrisma.ticket.findFirst).not.toHaveBeenCalled();
  });

  it('PATCH /tickets/:id updates an existing ticket for an agent', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue({ id: 1, status: 'open' });
    mockPrisma.ticket.update.mockResolvedValue({ id: 1, status: 'resolved' });

    const res = await asAgent(request(app).patch('/tickets/1').send({ status: 'resolved' }));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
  });

  it('PATCH /tickets/:id is forbidden for a customer', async () => {
    const res = await asCustomer(request(app).patch('/tickets/1').send({ status: 'resolved' }));

    expect(res.status).toBe(403);
    expect(mockPrisma.ticket.findFirst).not.toHaveBeenCalled();
  });

  it('PATCH /tickets/:id returns 404 for a ticket outside the agent\'s queue', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue(null);

    const res = await asAgent(request(app).patch('/tickets/999').send({ status: 'resolved' }));

    expect(res.status).toBe(404);
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  it('PATCH /tickets/:id with an empty body returns 400', async () => {
    const res = await asAgent(request(app).patch('/tickets/1').send({}));

    expect(res.status).toBe(400);
    expect(mockPrisma.ticket.findFirst).not.toHaveBeenCalled();
  });

  it('DELETE /tickets/:id removes an existing ticket and returns 204', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.ticket.delete.mockResolvedValue({ id: 1 });

    const res = await asAdmin(request(app).delete('/tickets/1'));

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(mockPrisma.ticket.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('DELETE /tickets/:id returns 404 for a ticket that does not exist', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue(null);

    const res = await asAdmin(request(app).delete('/tickets/999'));

    expect(res.status).toBe(404);
    expect(mockPrisma.ticket.delete).not.toHaveBeenCalled();
  });
});
