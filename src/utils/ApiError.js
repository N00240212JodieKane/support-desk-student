// A thrown/forwarded error that already knows its own HTTP status — lets
// controllers/services `throw new ApiError(404, '...')` instead of each
// hand-rolling a `res.status(...).json(...)` call. errorHandler.js (the one
// centralized place that turns errors into responses) reads `status` and
// `details` off whatever it catches; a plain `Error` still works too, it
// just falls back to 500 (see errorHandler.js).
export default class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Only validation errors (middleware/validate.js) set this — an array
    // of { field, message } pairs describing what was wrong with the request.
    this.details = details;
  }
}
