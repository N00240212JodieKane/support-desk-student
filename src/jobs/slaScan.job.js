// The consumer side of the SLA-scan job: the function BullMQ actually calls
// each time a job lands on the `sla-scan` queue (see src/worker.js, which
// hands this straight to `new Worker(...)`). Deliberately thin — all the
// actual query/update/emit logic lives in services/ticket.service.js's
// escalateOverdueTickets, the same service function a controller would call
// if this were ever exposed over HTTP. This function's only job is the glue
// BullMQ needs: read config, call the service, return a result BullMQ can
// log/inspect.
import env from '../config/env.js';
import { escalateOverdueTickets } from '../services/ticket.service.js';

const processSlaScan = async () => {
  const escalatedCount = await escalateOverdueTickets(env.SLA_BREACH_HOURS);
  return { escalatedCount };
};

export default processSlaScan;
