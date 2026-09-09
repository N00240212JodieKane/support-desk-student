// Tests the centralized error handler directly against a fake `res` — no
// Express app, no supertest, since this is a plain function that only ever
// touches `err` and `res` (see middleware/errorHandler.js).
import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import errorHandler from '../../src/middleware/errorHandler.js';
import ApiError from '../../src/utils/ApiError.js';

const fakeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const prismaError = (code, meta) =>
  new Prisma.PrismaClientKnownRequestError('internal Prisma detail', {
    code,
    clientVersion: '6.19.3',
    meta,
  });

describe('errorHandler', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('responds with an ApiError\'s own status and message', () => {
    const res = fakeRes();

    errorHandler(new ApiError(404, 'Ticket 5 not found'), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Ticket 5 not found' } });
  });

  it('includes validation details when the error carries them', () => {
    const res = fakeRes();
    const details = [{ field: 'subject', message: 'Required' }];

    errorHandler(new ApiError(400, 'Validation failed', details), {}, res, () => {});

    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Validation failed', details },
    });
  });

  it('maps a Prisma unique-constraint error (P2002) to 409', () => {
    const res = fakeRes();

    errorHandler(prismaError('P2002', { target: ['name'] }), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.error.message).not.toMatch(/internal Prisma detail/);
  });

  it('maps a Prisma foreign-key error (P2003) to 409', () => {
    const res = fakeRes();

    errorHandler(prismaError('P2003'), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('falls back to a generic 500 and hides the real message for an unrecognised error', () => {
    const res = fakeRes();

    errorHandler(new Error('leaked internal detail: /etc/secrets'), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Internal Server Error' } });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
