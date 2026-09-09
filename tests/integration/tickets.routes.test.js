// Week 2: same reasoning as tests/unit/ticket.service.test.js — the shared
// Prisma client (src/config/db.js) is mocked out before `app.js` is ever
// imported, so this still exercises real Express routing/middleware via
// supertest with no database involved. A real endpoint/integration suite
// against an actual (test) database arrives in Week 6 (see PLAN.md).
import { jest } from '@jest/globals';
import request from 'supertest';

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

const { default: app } = await import('../../src/app.js');

describe('GET/POST /tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /tickets returns the list Prisma finds', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([
      { id: 1, subject: 'Cannot log in', status: 'open' },
    ]);

    const res = await request(app).get('/tickets');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /tickets creates a ticket', async () => {
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
    expect(res.body).toMatchObject({
      subject: 'Cannot reset password',
      status: 'open',
    });
  });

  it('POST /tickets without a customerId returns 400', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({ subject: 'Cannot reset password', description: 'Link expired' });

    expect(res.status).toBe(400);
    expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
  });

  it('GET /tickets/:id returns 404 when Prisma finds nothing', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/tickets/999');

    expect(res.status).toBe(404);
  });

  it('GET /tickets/:id returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/tickets/not-a-number');

    expect(res.status).toBe(400);
    expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
  });
});
