// Week 6 hardening: caps how many requests one IP can make in a window,
// the same idea as Laravel's `throttle` middleware. Two limiters, not one —
// login/register need a much tighter cap than the rest of the API, because
// they're the one place an attacker can profit from hammering the endpoint
// (credential stuffing, brute-forcing a password) in a way that "someone's
// polling the ticket list too often" never does.
import rateLimit from 'express-rate-limit';

const respondWithApiError = (req, res) => {
  res.status(429).json({ error: { message: 'Too many requests — please try again later.' } });
};

// Applied to every route in app.js. Generous on purpose: this is a backstop
// against something going seriously wrong (a runaway client, a scraper),
// not a per-user quota — that would need per-user identity, which anonymous
// requests to /auth don't have yet.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: respondWithApiError,
});

// Applied only to /auth (see routes/auth.routes.js) — tight enough to make
// brute-forcing a password impractical without also locking out a genuine
// user who just mistyped their password a couple of times.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: respondWithApiError,
});
