// A role allow-list, applied per-route the same way validate.js applies a
// schema: `authorize('agent', 'admin')` reads as "only these roles may
// reach this route at all." Always runs after authenticate.js — it only
// ever reads req.user.role, never sets it.
import ApiError from '../utils/ApiError.js';

export default (...allowedRoles) =>
  (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }

    next();
  };
