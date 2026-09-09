// Checks a request carries a valid JWT and, if so, attaches who it's for —
// `req.user` — so every downstream controller/middleware can trust it's
// already there rather than re-decoding the token itself. Runs before
// authorize.js (which reads req.user.role) on every protected route.
import ApiError from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';

export default (req, res, next) => {
  const header = req.get('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const payload = verifyToken(token);
    // Only what the rest of the app actually needs to know about the
    // caller — an id to scope queries by, a role to authorize actions with.
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};
