// Validation middleware factory wrapping a Zod schema — applied per-route as
// `validate({ body: createTicketSchema })` (see CLAUDE.md). Not a
// `BaseRequest` class a controller extends: this stays a plain function that
// returns a plain middleware function, same shape as every other middleware
// in this project.
import ApiError from '../utils/ApiError.js';

const REQUEST_PARTS = ['params', 'query', 'body'];

// `schemas` supplies a Zod schema for whichever of params/query/body this
// route needs checked — a route with no body to validate (e.g. GET /tags)
// just omits `body` and that part is skipped entirely.
export default (schemas) =>
  (req, res, next) => {
    for (const part of REQUEST_PARTS) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join('.') || part,
          message: issue.message,
        }));
        return next(new ApiError(400, 'Validation failed', details));
      }

      // Parsed data replaces the raw request data — this is what actually
      // applies Zod defaults (e.g. `page` defaulting to 1) and coercions
      // (e.g. the `?page=2` string becoming the number 2), not just checks
      // that the raw data was already valid.
      req[part] = result.data;
    }

    next();
  };
