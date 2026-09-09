// Wraps jsonwebtoken so the rest of the app never touches env.JWT_SECRET
// directly — auth.controller.js (issuing a token) and
// middleware/authenticate.js (checking one) both go through these two
// functions instead of each calling jwt.sign/jwt.verify with their own copy
// of the secret and options.
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

// `payload` is deliberately small — just enough to identify who's making
// the request and what they're allowed to do, nothing that changes often or
// that would be sensitive if the token were ever decoded by someone else (a
// JWT's payload is signed, not encrypted — readable by anyone who has it).
export const signToken = (payload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

// Throws if the token is malformed, signed with a different secret, or past
// its expiry — middleware/authenticate.js is what turns that throw into a
// clean 401.
export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);
