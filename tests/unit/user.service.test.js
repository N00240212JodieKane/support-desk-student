import { jest } from '@jest/globals';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: mockPrisma,
}));

const { findUserByEmail, findUserById, createCustomer } = await import(
  '../../src/services/user.service.js'
);

describe('user.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findUserByEmail returns the full row, password hash included', async () => {
    const user = { id: 1, email: 'casey@example.com', password: 'a-bcrypt-hash' };
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await findUserByEmail('casey@example.com');

    expect(result).toBe(user);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'casey@example.com' } });
  });

  it('findUserById never selects the password column', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });

    await findUserById(1);

    const { select } = mockPrisma.user.findUnique.mock.calls[0][0];
    expect(select.password).toBeUndefined();
    expect(select).toEqual(expect.objectContaining({ id: true, name: true, email: true, role: true }));
  });

  it('createCustomer hashes the password before it ever reaches Prisma', async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 2, name: 'New', email: 'new@example.com', role: 'customer' });

    await createCustomer({ name: 'New', email: 'new@example.com', password: 'password123' });

    const { data } = mockPrisma.user.create.mock.calls[0][0];
    expect(data.password).not.toBe('password123');
  });

  it('createCustomer always forces role to customer, ignoring anything else', async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 2, role: 'customer' });

    await createCustomer({ name: 'New', email: 'new@example.com', password: 'password123' });

    const { data } = mockPrisma.user.create.mock.calls[0][0];
    expect(data.role).toBe('customer');
  });

  it('createCustomer never selects the password column back', async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 2, role: 'customer' });

    await createCustomer({ name: 'New', email: 'new@example.com', password: 'password123' });

    const { select } = mockPrisma.user.create.mock.calls[0][0];
    expect(select.password).toBeUndefined();
  });
});
