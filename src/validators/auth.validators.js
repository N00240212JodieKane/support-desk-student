import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

// Deliberately looser than registerSchema's password rule — a login
// attempt is checked against whatever hash is already stored, not
// re-validated against today's password policy. A very short password is
// simply going to be wrong, and bcrypt.compare (Lesson 4's password
// utility) says so on its own; requiring 8+ characters here would only
// reject a stale, once-valid password with the wrong error message.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'password is required'),
});
