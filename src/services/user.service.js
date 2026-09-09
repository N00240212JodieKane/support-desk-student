import prisma from '../config/db.js';
import { hashPassword } from '../utils/password.js';

// Never includes `password` — every function here except findUserByEmail
// (login needs the hash to compare against) is safe to hand its result
// straight to a response.
const PUBLIC_FIELDS = { id: true, name: true, email: true, role: true, createdAt: true };

// Returns the full row, password hash included — auth.controller.js's login
// is the one place in this project that actually needs it.
export const findUserByEmail = async (email) => prisma.user.findUnique({ where: { email } });

export const findUserById = async (id) =>
  prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });

// Public registration always creates a `customer` — `role` is never read
// from the request body here, deliberately (see the registration topic).
export const createCustomer = async ({ name, email, password }) => {
  const hashedPassword = await hashPassword(password);

  return prisma.user.create({
    data: { name, email, password: hashedPassword, role: 'customer' },
    select: PUBLIC_FIELDS,
  });
};
