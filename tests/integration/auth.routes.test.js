// Real bcrypt and real jsonwebtoken here — only prisma.user is mocked. This
// is the one integration suite that exercises hashPassword/verifyPassword
// for real, since faking them out would mean testing nothing but plumbing.
import { jest } from '@jest/globals';
import request from 'supertest';
import { hashPassword } from '../../src/utils/password.js';
import { verifyToken } from '../../src/utils/jwt.js';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: mockPrisma,
}));

const { default: app } = await import('../../src/app.js');

describe('POST /auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a customer and returns a usable token', async () => {
    mockPrisma.user.create.mockResolvedValue({
      id: 1,
      name: 'Casey Customer',
      email: 'casey@example.com',
      role: 'customer',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Casey Customer', email: 'casey@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'casey@example.com', role: 'customer' });
    expect(res.body.data.user.password).toBeUndefined();

    const payload = verifyToken(res.body.data.token);
    expect(payload).toMatchObject({ sub: 1, role: 'customer' });
  });

  it('ignores a role supplied in the body — always creates a customer', async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 1, role: 'customer' });

    await request(app)
      .post('/auth/register')
      .send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'password123', role: 'admin' });

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'customer' }) }),
    );
  });

  it('rejects a password under 8 characters', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Casey', email: 'casey@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in with the correct password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Casey Customer',
      email: 'casey@example.com',
      role: 'customer',
      password: await hashPassword('password123'),
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'casey@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.password).toBeUndefined();
    expect(verifyToken(res.body.data.token)).toMatchObject({ sub: 1, role: 'customer' });
  });

  it('rejects an incorrect password with a 401', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'casey@example.com',
      role: 'customer',
      password: await hashPassword('password123'),
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'casey@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with the exact same 401 and message as a wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });
});
