import { jest } from '@jest/globals';
import authorize from '../../src/middleware/authorize.js';

describe('authorize middleware', () => {
  it('calls next() when req.user.role is in the allow-list', () => {
    const req = { user: { id: 1, role: 'agent' } };
    const next = jest.fn();

    authorize('agent', 'admin')(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('forwards a 403 ApiError when req.user.role is not in the allow-list', () => {
    const req = { user: { id: 1, role: 'customer' } };
    const next = jest.fn();

    authorize('agent', 'admin')(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(403);
  });

  it('accepts any number of allowed roles', () => {
    const req = { user: { id: 1, role: 'customer' } };
    const next = jest.fn();

    authorize('customer')(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });
});
