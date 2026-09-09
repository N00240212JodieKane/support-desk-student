// The middleware factory itself, tested against a plain ad hoc Zod schema —
// deliberately not one of the real validators, to keep this focused on what
// validate.js does with a schema's result (call next(), attach a 400
// ApiError, replace req[part]) rather than any one resource's rules.
import { jest } from '@jest/globals';
import { z } from 'zod';
import validate from '../../src/middleware/validate.js';
import ApiError from '../../src/utils/ApiError.js';

const schema = z.object({ name: z.string().min(1) });

describe('validate middleware', () => {
  it('calls next() with no error when the schema passes', () => {
    const req = { body: { name: 'Casey' }, params: {}, query: {} };
    const next = jest.fn();

    validate({ body: schema })(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('replaces req.body with the parsed (and defaulted/coerced) data', () => {
    const withDefault = z.object({ name: z.string().default('anonymous') });
    const req = { body: {}, params: {}, query: {} };

    validate({ body: withDefault })(req, {}, jest.fn());

    expect(req.body).toEqual({ name: 'anonymous' });
  });

  it('forwards a 400 ApiError with per-field details when the schema fails', () => {
    const req = { body: { name: '' }, params: {}, query: {} };
    const next = jest.fn();

    validate({ body: schema })(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.details).toEqual([expect.objectContaining({ field: 'name' })]);
  });

  it('only checks the request parts a route actually declared a schema for', () => {
    const req = { body: {}, params: {}, query: { page: 'not-a-number' } };
    const next = jest.fn();

    // No `query` schema given — an invalid query value should be ignored.
    validate({ body: schema.partial() })(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });
});
