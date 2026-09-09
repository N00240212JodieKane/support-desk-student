// Week 4: reading the tag list is open to any authenticated role; changing
// it is staff-only (authorize('agent', 'admin') in tag.routes.js).
import { jest } from '@jest/globals';
import request from 'supertest';
import { signToken } from '../../src/utils/jwt.js';

const mockPrisma = {
  tag: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

describe('/tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/tags');

    expect(res.status).toBe(401);
  });

  it('GET /tags is readable by a customer', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([{ id: 1, name: 'billing' }]);

    const res = await asCustomer(request(app).get('/tags'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toBeUndefined();
  });

  it('POST /tags is forbidden for a customer', async () => {
    const res = await asCustomer(request(app).post('/tags').send({ name: 'urgent' }));

    expect(res.status).toBe(403);
    expect(mockPrisma.tag.create).not.toHaveBeenCalled();
  });

  it('POST /tags creates a tag for an agent', async () => {
    mockPrisma.tag.create.mockResolvedValue({ id: 2, name: 'urgent' });

    const res = await asAgent(request(app).post('/tags').send({ name: 'urgent' }));

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: 2, name: 'urgent' });
  });

  it('POST /tags with a blank name returns 400', async () => {
    const res = await asAgent(request(app).post('/tags').send({ name: '  ' }));

    expect(res.status).toBe(400);
    expect(mockPrisma.tag.create).not.toHaveBeenCalled();
  });

  it('DELETE /tags/:id returns 404 for a tag that does not exist', async () => {
    mockPrisma.tag.findUnique.mockResolvedValue(null);

    const res = await asAgent(request(app).delete('/tags/999'));

    expect(res.status).toBe(404);
    expect(mockPrisma.tag.delete).not.toHaveBeenCalled();
  });

  it('DELETE /tags/:id removes an existing tag and returns 204', async () => {
    mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, name: 'billing' });
    mockPrisma.tag.delete.mockResolvedValue({ id: 1 });

    const res = await asAgent(request(app).delete('/tags/1'));

    expect(res.status).toBe(204);
  });
});
