// Unit tests against a validator directly — no Express, no mocked Prisma,
// just the Zod schema itself. Cheap to write and exactly what "unit tests
// against services/validators" (PLAN.md, Week 3) means: these don't need
// jest.unstable_mockModule at all, since a Zod schema has no module of its
// own to mock out.
import {
  createTicketSchema,
  updateTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
} from '../../src/validators/ticket.validators.js';

describe('createTicketSchema', () => {
  it('accepts a valid ticket body', () => {
    const result = createTicketSchema.safeParse({
      subject: 'Cannot log in',
      description: 'Password reset link expired',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a missing subject', () => {
    const result = createTicketSchema.safeParse({
      description: 'Password reset link expired',
    });

    expect(result.success).toBe(false);
  });

  it('silently drops a customerId in the body rather than trusting it', () => {
    // Week 4: customerId always comes from req.user.id, never the request
    // body — a client-supplied one is stripped, not rejected, since it's
    // simply not part of this schema's shape any more.
    const result = createTicketSchema.safeParse({
      subject: 'Cannot log in',
      description: 'Password reset link expired',
      customerId: 999,
    });

    expect(result.success).toBe(true);
    expect(result.data.customerId).toBeUndefined();
  });
});

describe('updateTicketSchema', () => {
  it('accepts a partial update with a single field', () => {
    const result = updateTicketSchema.safeParse({ status: 'resolved' });

    expect(result.success).toBe(true);
  });

  it('rejects an empty body', () => {
    const result = updateTicketSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('rejects a status outside the known enum', () => {
    const result = updateTicketSchema.safeParse({ status: 'archived' });

    expect(result.success).toBe(false);
  });
});

describe('listTicketsQuerySchema', () => {
  it('fills in defaults for an empty query', () => {
    const result = listTicketsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      sortBy: 'createdAt',
      order: 'desc',
      page: 1,
      pageSize: 10,
    });
  });

  it('coerces page/pageSize from query-string values', () => {
    const result = listTicketsQuerySchema.safeParse({ page: '2', pageSize: '25' });

    expect(result.success).toBe(true);
    expect(result.data.page).toBe(2);
    expect(result.data.pageSize).toBe(25);
  });

  it('rejects a pageSize above the cap', () => {
    const result = listTicketsQuerySchema.safeParse({ pageSize: '500' });

    expect(result.success).toBe(false);
  });
});

describe('ticketIdParamSchema', () => {
  it('coerces a numeric id string', () => {
    const result = ticketIdParamSchema.safeParse({ id: '7' });

    expect(result.success).toBe(true);
    expect(result.data.id).toBe(7);
  });

  it('rejects a non-numeric id', () => {
    const result = ticketIdParamSchema.safeParse({ id: 'seven' });

    expect(result.success).toBe(false);
  });
});
