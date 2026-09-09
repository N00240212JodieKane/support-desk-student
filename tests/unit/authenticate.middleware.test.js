// Same "call the middleware directly with fakes for req/next" approach as
// validate.middleware.test.js (Lesson 3) — authenticate.js never touches
// Express internals beyond req.get(...), so a plain object with a `get`
// method is a complete enough fake req.
import { jest } from '@jest/globals';
import authenticate from '../../src/middleware/authenticate.js';
import { signToken } from '../../src/utils/jwt.js';
import ApiError from '../../src/utils/ApiError.js';

const fakeReq = (authorizationHeader) => ({
  get: (name) => (name === 'Authorization' ? authorizationHeader : undefined),
});

describe('authenticate middleware', () => {
  it('attaches req.user from a valid Bearer token', () => {
    const token = signToken({ sub: 5, role: 'agent' });
    const req = fakeReq(`Bearer ${token}`);
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(req.user).toEqual({ id: 5, role: 'agent' });
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards a 401 ApiError when there is no Authorization header at all', () => {
    const req = fakeReq(undefined);
    const next = jest.fn();

    authenticate(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
  });

  it('forwards a 401 ApiError when the header is missing the "Bearer " prefix', () => {
    const token = signToken({ sub: 5, role: 'agent' });
    const req = fakeReq(token); // no "Bearer " prefix
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('forwards a 401 ApiError for a malformed or invalid token', () => {
    const req = fakeReq('Bearer not-a-real-token');
    const next = jest.fn();

    authenticate(req, {}, next);

    expect(next.mock.calls[0][0].status).toBe(401);
  });
});
