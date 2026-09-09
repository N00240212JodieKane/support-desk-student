// Centralised error handler — the single place that turns a thrown/forwarded
// error into a JSON response, instead of a try/catch in every controller.
// Must be registered last, after all routes and other middleware.
//
// This is the error half of the "consistent JSON response/error shape" from
// CLAUDE.md — the success half (sendResource/sendCollection) lives in
// utils/response.js. Every error response this API sends has the same
// `{ error: { message, details? } }` envelope, whether it came from
// validate.js, an ApiError a controller threw on purpose, or something
// unexpected Prisma/Express raised.
import { Prisma } from '@prisma/client';

// A handful of Prisma's own "known request" error codes map cleanly onto
// HTTP statuses students will recognise — found by actually hitting these
// cases while smoke-testing (creating a Tag with a name that already
// exists; deleting a Ticket that still has Comments pointing at it via a
// foreign key). Without this, both surfaced as a raw 500 with Prisma's
// internal error text leaking straight into the response body.
const PRISMA_ERROR_STATUS = {
  P2002: 409, // unique constraint failed (e.g. a Tag name that already exists)
  P2003: 409, // foreign key constraint failed (e.g. deleting a Ticket that still has Comments)
  P2025: 404, // the record a query expected to find/update/delete doesn't exist
};

const describePrismaError = (err) => {
  switch (err.code) {
    case 'P2002':
      return `A record with that ${err.meta?.target ?? 'value'} already exists`;
    case 'P2003':
      return 'This record cannot be deleted or changed because other records still depend on it';
    case 'P2025':
      return 'The requested record was not found';
    default:
      return 'Database request failed';
  }
};

export default (err, req, res, next) => {
  let status = err.status;
  let message = err.message;

  if (!status && err instanceof Prisma.PrismaClientKnownRequestError && PRISMA_ERROR_STATUS[err.code]) {
    status = PRISMA_ERROR_STATUS[err.code];
    message = describePrismaError(err);
  }

  status = status || 500;

  // An error nothing above recognised is a bug, not a client mistake — log
  // the real thing so it doesn't disappear into a generic response with
  // nothing in the terminal to debug from, but never let its raw message
  // (which might describe internal file paths, SQL, etc.) reach the client.
  if (status === 500) {
    console.error(err);
    message = 'Internal Server Error';
  }

  const body = { error: { message } };
  // Only validate.js's ApiError sets `details` (the list of what failed and
  // why) — every other error just gets the plain `message` above.
  if (err.details) {
    body.error.details = err.details;
  }

  res.status(status).json(body);
};
