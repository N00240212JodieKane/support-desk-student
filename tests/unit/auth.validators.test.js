import { registerSchema, loginSchema } from '../../src/validators/auth.validators.js';

describe('registerSchema', () => {
  it('accepts a valid registration, lowercasing the email', () => {
    const result = registerSchema.safeParse({
      name: 'Casey Customer',
      email: 'Casey@Example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(result.data.email).toBe('casey@example.com');
  });

  it('rejects a password under 8 characters', () => {
    const result = registerSchema.safeParse({
      name: 'Casey',
      email: 'casey@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({
      name: 'Casey',
      email: 'not-an-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('has no field for role — registration can never choose one', () => {
    const result = registerSchema.safeParse({
      name: 'Casey',
      email: 'casey@example.com',
      password: 'password123',
      role: 'admin',
    });

    expect(result.success).toBe(true);
    expect(result.data.role).toBeUndefined();
  });
});

describe('loginSchema', () => {
  it('accepts any non-empty password, even a short one', () => {
    const result = loginSchema.safeParse({ email: 'casey@example.com', password: 'x' });

    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'casey@example.com', password: '' });

    expect(result.success).toBe(false);
  });
});
