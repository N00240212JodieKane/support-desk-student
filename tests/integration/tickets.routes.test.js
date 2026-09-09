// Week 3: exercises the full CRUD surface, validation middleware, and the
// `{ data }`/`{ data, meta }`/`{ error }` response envelope from
// utils/response.js + errorHandler.js — same mocked-Prisma-client approach
// as Week 2 (see tests/unit/ticket.service.test.js), still no real database.
import { jest } from '@jest/globals';
import request from 'supertest';

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

const { default: app } = await import('../../src/app.js');

describe('/tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /tickets returns a paginated list envelope', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([
      { id: 1, subject: 'Cannot log in', status: 'open' },
    ]);
    mockPrisma.ticket.count.mockResolvedValue(1);

    const res = await request(app).get('/tickets');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
  });

  it('GET /tickets?status=open filters and rejects an unknown status', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    const ok = await request(app).get('/tickets?status=open');
    expect(ok.status).toBe(200);
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'open' } }),
    );

    const bad = await request(app).get('/tickets?status=archived');
    expect(bad.status).toBe(400);
    expect(bad.body.error.details).toBeDefined();
  });

  it('POST /tickets creates a ticket and wraps it in { data }', async () => {
    mockPrisma.ticket.create.mockResolvedValue({
      id: 3,
      subject: 'Cannot reset password',
      description: 'Link expired',
      status: 'open',
      customerId: 1,
    });

    const res = await request(app)
      .post('/tickets')
      .send({ subject: 'Cannot reset password', description: 'Link expired', customerId: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subject: 'Cannot reset password', status: 'open' });
  });

  it('POST /tickets without a customerId returns a 400 with validation details', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({ subject: 'Cannot reset password', description: 'Link expired' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'customerId' })]),
    );
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  it('GET /tickets/:id returns 404 when Prisma finds nothing', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/tickets/999');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/999/);
  });

  it('GET /tickets/:id returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/tickets/not-a-number');

    expect(res.status).toBe(400);
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('PATCH /tickets/:id updates an existing ticket', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({ id: 1, status: 'open' });
    mockPrisma.ticket.update.mockResolvedValue({ id: 1, status: 'resolved' });

    const res = await request(app).patch('/tickets/1').send({ status: 'resolved' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
  });

  it('PATCH /tickets/:id returns 404 for a ticket that does not exist', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    const res = await request(app).patch('/tickets/999').send({ status: 'resolved' });

    expect(res.status).toBe(404);
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  it('PATCH /tickets/:id with an empty body returns 400', async () => {
    const res = await request(app).patch('/tickets/1').send({});

    expect(res.status).toBe(400);
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('DELETE /tickets/:id removes an existing ticket and returns 204', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.ticket.delete.mockResolvedValue({ id: 1 });

    const res = await request(app).delete('/tickets/1');

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(mockPrisma.ticket.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('DELETE /tickets/:id returns 404 for a ticket that does not exist', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    const res = await request(app).delete('/tickets/999');

    expect(res.status).toBe(404);
    expect(mockPrisma.ticket.delete).not.toHaveBeenCalled();
  });
});
