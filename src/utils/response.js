// The response-shaping half of "consistent JSON response/error shape" (see
// CLAUDE.md) — a small set of plain functions every controller calls
// instead of each inventing its own `res.json(...)` shape. Not a
// `Resource`/`Transformer` class hierarchy: these don't describe *what*
// fields a resource has, only the envelope every response is wrapped in.
// The error side of the same convention lives in errorHandler.js.

// A single resource — GET /tickets/:id, POST /tickets, etc.
export const sendResource = (res, data, status = 200) => res.status(status).json({ data });

// A list of resources — GET /tickets, GET /tickets/:id/comments, GET /tags.
// `meta` is omitted entirely for endpoints that don't paginate (comments,
// tags) rather than sent as `null`/`{}` — see the ticket list controller for
// the one endpoint that does pass it.
export const sendCollection = (res, data, meta) =>
  res.status(200).json(meta ? { data, meta } : { data });
