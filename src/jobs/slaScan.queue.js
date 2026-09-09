// The producer side of the SLA-scan job: adds a *repeatable* job to a
// BullMQ queue, so something keeps landing on it every SLA_SCAN_INTERVAL_MS
// without a node-cron timer anywhere (see "why not node-cron" and PLAN.md's
// Key decisions). Producing and processing are deliberately separate
// modules — scheduleSlaScan() below only ever runs in the API process
// (called once from server.js, never app.js — see CLAUDE.md's app.js/
// server.js split, and the same reasoning that keeps initSocket() out of
// app.js); the actual scan logic (jobs/slaScan.job.js) only ever runs in
// the worker process (src/worker.js). Neither file imports the other.
import { Queue } from 'bullmq';
import connection from '../config/redis.js';
import env from '../config/env.js';

export const QUEUE_NAME = 'sla-scan';

export const slaScanQueue = new Queue(QUEUE_NAME, { connection });

// A fixed scheduler id means calling this again (e.g. every time the API
// process restarts under `npm run dev`) *upserts* the same repeatable
// schedule instead of stacking up duplicates — BullMQ's Job Scheduler keys
// on this id, not on how many times upsertJobScheduler() gets called.
export const scheduleSlaScan = async () =>
  slaScanQueue.upsertJobScheduler(
    'sla-scan-repeatable',
    { every: env.SLA_SCAN_INTERVAL_MS },
    {
      name: 'scan',
      opts: {
        // Retries + backoff — the point of a real queue over a bare timer
        // (PLAN.md's Key decisions): a scan that throws (e.g. the DB is
        // briefly unreachable) gets retried with a growing delay instead
        // of silently never running again until the next scheduled tick.
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    },
  );
