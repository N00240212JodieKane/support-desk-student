// The BullMQ worker process — a second, separate Node process from the API
// (src/server.js), started on its own (`npm run worker`) and never imported
// by app.js or server.js. This is the point PLAN.md's "API containerization"
// talks about: the app stops being one process once there's a worker to run
// alongside it, which is exactly why docker-compose.yml gets an `api` *and*
// a `worker` service built from the same image in Week 6, rather than one.
//
// Side-effect import, same idiom as app.js's `import './events/index.js'`:
// this process needs its own copy of every listener registered, because an
// EventEmitter's listeners only exist in the process that registered them —
// registering them in server.js does nothing for this process. See
// events/listeners/notifyRealtime.listener.js's ticket.sla_breached handler
// for what that means in practice for one of the three channels.
import './events/index.js';
import { Worker } from 'bullmq';
import connection from './config/redis.js';
import { QUEUE_NAME } from './jobs/slaScan.queue.js';
import processSlaScan from './jobs/slaScan.job.js';

const worker = new Worker(QUEUE_NAME, processSlaScan, { connection });

worker.on('completed', (job, result) => {
  console.log(`[worker] ${job.name} completed — escalated ${result.escalatedCount} ticket(s).`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] ${job?.name ?? 'job'} failed:`, err);
});

console.log(`Worker listening on the "${QUEUE_NAME}" queue.`);
