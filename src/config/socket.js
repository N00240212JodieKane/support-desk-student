// A single shared Socket.IO server for the whole app — same "import =
// singleton" idiom as db.js/mailer.js, but this one needs a real HTTP
// server to attach to (server.js's http.createServer(app), not app.js —
// see CLAUDE.md's app.js/server.js split), so it's created lazily via
// initSocket() instead of at module-load time.
//
// A connected client isn't associated with any user until it sends its JWT
// over the `authenticate` event — the same token already used for HTTP
// requests (utils/jwt.js), just handed over once per socket connection
// instead of once per request. Once verified, the socket joins a room
// per user (`user:<id>`) and, for agents/admins, a shared role room
// (`role:agent`/`role:admin`) — see events/listeners/notifyRealtime.listener.js
// for what gets broadcast to each.
import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    // Wide open for now — week 5 has no deployed frontend origin to pin
    // this to yet; tighten once the React app's dev/prod origins are known.
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    socket.on('authenticate', (token) => {
      try {
        const { sub, role } = verifyToken(token);
        socket.join(`user:${sub}`);
        if (role === 'agent' || role === 'admin') {
          socket.join(`role:${role}`);
        }
      } catch {
        // Same failure mode as middleware/authenticate.js: a missing,
        // malformed, or expired token just never gets this socket into any
        // room, so it receives no notification pushes. Disconnecting is
        // more useful feedback for a rejected token than leaving the client
        // silently un-joined.
        socket.disconnect();
      }
    });
  });

  return io;
};

// Returns `undefined` rather than throwing when Socket.IO hasn't been
// initialized — notably true in tests that import app.js directly via
// supertest without ever starting a real server (see CLAUDE.md). Listeners
// (events/listeners/notifyRealtime.listener.js) treat that as "no realtime
// channel available right now" and skip the push, rather than crashing the
// request that triggered the event.
export const getIO = () => io;
