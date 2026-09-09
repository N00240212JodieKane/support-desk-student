// Week 6: the thin glue BullMQ actually calls (src/worker.js) — see
// src/jobs/slaScan.job.js's own comment for why the real logic lives in
// services/ticket.service.js's escalateOverdueTickets instead of here.
// This test only needs to confirm the glue itself: reads SLA_BREACH_HOURS,
// calls the service with it, and shapes the service's return value into
// the result object BullMQ logs (see src/worker.js's 'completed' handler).
import { jest } from '@jest/globals';

const mockEscalateOverdueTickets = jest.fn();

jest.unstable_mockModule('../../src/services/ticket.service.js', () => ({
  escalateOverdueTickets: mockEscalateOverdueTickets,
}));

const { default: processSlaScan } = await import('../../src/jobs/slaScan.job.js');
const { default: env } = await import('../../src/config/env.js');

describe('slaScan.job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('escalates using the configured SLA threshold and reports how many tickets it escalated', async () => {
    mockEscalateOverdueTickets.mockResolvedValue(2);

    const result = await processSlaScan();

    expect(mockEscalateOverdueTickets).toHaveBeenCalledWith(env.SLA_BREACH_HOURS);
    expect(result).toEqual({ escalatedCount: 2 });
  });
});
