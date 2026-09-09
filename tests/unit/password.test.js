// Real bcrypt, not mocked — hashing/comparing is exactly the behavior under
// test here, and bcrypt is fast enough at this project's SALT_ROUNDS that
// there's no reason to fake it out the way the Prisma client is faked
// elsewhere.
import { hashPassword, verifyPassword } from '../../src/utils/password.js';

describe('password utils', () => {
  it('hashPassword never returns the plain password itself', async () => {
    const hash = await hashPassword('password123');

    expect(hash).not.toBe('password123');
  });

  it('verifyPassword accepts the correct password against its own hash', async () => {
    const hash = await hashPassword('password123');

    expect(await verifyPassword('password123', hash)).toBe(true);
  });

  it('verifyPassword rejects an incorrect password', async () => {
    const hash = await hashPassword('password123');

    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('hashing the same password twice produces two different hashes', async () => {
    // bcrypt salts each hash independently — two hashes of the same
    // password should never be byte-for-byte equal, even though both
    // still verify correctly against that password.
    const [hashA, hashB] = await Promise.all([hashPassword('password123'), hashPassword('password123')]);

    expect(hashA).not.toBe(hashB);
  });
});
