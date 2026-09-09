import http from 'node:http';
import app from './app.js';
import env from './config/env.js';
import { initSocket } from './config/socket.js';
import { scheduleSlaScan } from './jobs/slaScan.queue.js';

// Socket.IO needs a real http.Server to attach to, not just the Express
// app — app.listen() normally creates one internally and hides it, so it's
// created explicitly here instead (see config/socket.js).
const httpServer = http.createServer(app);
initSocket(httpServer);

// Same reasoning as initSocket() above for living here instead of app.js:
// this needs Redis, which a test importing app.js directly via supertest
// (CLAUDE.md's app.js/server.js split) should never have to have running.
// This only *schedules* the repeatable job (a Redis write) — actually
// running it is src/worker.js's job, a separate process entirely.
scheduleSlaScan();

httpServer.listen(env.PORT, () => {
  console.log(`Support Desk API listening on http://localhost:${env.PORT}`);
});
