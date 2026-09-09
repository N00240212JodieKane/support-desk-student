// Real jsonwebtoken against the dev JWT_SECRET already loaded from .env
// (config/env.js, imported transitively by utils/jwt.js) — nothing here is
// mocked, since signing and verifying a real token is exactly the behavior
// under test.
import { signToken, verifyToken } from '../../src/utils/jwt.js';

describe('jwt utils', () => {
  it('round-trips a payload through signToken and verifyToken', () => {
    const token = signToken({ sub: 1, role: 'customer' });
    const payload = verifyToken(token);

    expect(payload.sub).toBe(1);
    expect(payload.role).toBe('customer');
  });

  it('throws when verifying a token that has been tampered with', () => {
    const token = signToken({ sub: 1, role: 'customer' });
    const tampered = `${token.slice(0, -2)}xx`;

    expect(() => verifyToken(tampered)).toThrow();
  });

  it('throws when verifying a string that is not a JWT at all', () => {
    expect(() => verifyToken('not-a-real-token')).toThrow();
  });
});
