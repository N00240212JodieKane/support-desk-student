// A single shared ioredis connection for the whole app — same "import =
// singleton" idiom as db.js's PrismaClient and mailer.js's transport — but
// this one gets imported from two different Node *processes* (the API via
// jobs/slaScan.queue.js, and the standalone worker via src/worker.js), not
// just two modules of the same process. That's fine: each process gets its
// own instance of this module (and so its own TCP connection to Redis) the
// same way each would get its own PrismaClient — "singleton" means "one per
// process that imports it", not "one for the whole app across processes".
import IORedis from 'ioredis';
import env from './env.js';

// BullMQ's own requirement, not a project preference: it manages retries
// itself and needs blocking commands that ioredis's default
// maxRetriesPerRequest would time out early — see
// https://docs.bullmq.io/guide/connections.
const connection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

export default connection;
