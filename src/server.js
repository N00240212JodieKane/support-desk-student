import http from 'node:http';
import app from './app.js';
import env from './config/env.js';
import { initSocket } from './config/socket.js';

// Socket.IO needs a real http.Server to attach to, not just the Express
// app — app.listen() normally creates one internally and hides it, so it's
// created explicitly here instead (see config/socket.js).
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`Support Desk API listening on http://localhost:${env.PORT}`);
});
