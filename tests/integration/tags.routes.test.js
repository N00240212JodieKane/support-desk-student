import { jest } from '@jest/globals';
import request from 'supertest';

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

describe('/tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /tags returns the list envelope with no pagination meta', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([{ id: 1, name: 'billing' }]);

    const res = await request(app).get('/tags');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toBeUndefined();
  });

  it('POST /tags creates a tag', async () => {
    mockPrisma.tag.create.mockResolvedValue({ id: 2, name: 'urgent' });

    const res = await request(app).post('/tags').send({ name: 'urgent' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: 2, name: 'urgent' });
  });

  it('POST /tags with a blank name returns 400', async () => {
    const res = await request(app).post('/tags').send({ name: '  ' });

    expect(res.status).toBe(400);
    expect(mockPrisma.tag.create).not.toHaveBeenCalled();
  });

  it('DELETE /tags/:id returns 404 for a tag that does not exist', async () => {
    mockPrisma.tag.findUnique.mockResolvedValue(null);

    const res = await request(app).delete('/tags/999');

    expect(res.status).toBe(404);
    expect(mockPrisma.tag.delete).not.toHaveBeenCalled();
  });

  it('DELETE /tags/:id removes an existing tag and returns 204', async () => {
    mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, name: 'billing' });
    mockPrisma.tag.delete.mockResolvedValue({ id: 1 });

    const res = await request(app).delete('/tags/1');

    expect(res.status).toBe(204);
  });
});
