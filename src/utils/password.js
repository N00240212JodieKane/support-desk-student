// Hashing lives in its own tiny module rather than inline in user.service.js
// so both `register` (hashing a new password) and `login` (verifying one
// against the stored hash) import the exact same logic — never two slightly
// different bcrypt calls drifting apart.
import bcrypt from 'bcrypt';

// The number of times bcrypt salts and re-hashes internally — higher costs
// more CPU time per hash (deliberately: that's what makes brute-forcing a
// stolen hash slow), so this is a trade-off, not a "bigger is always
// better" setting. 10 is bcrypt's own long-standing default.
const SALT_ROUNDS = 10;

export const hashPassword = async (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

export const verifyPassword = async (plainPassword, hash) => bcrypt.compare(plainPassword, hash);
