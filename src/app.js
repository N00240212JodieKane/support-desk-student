// Builds and exports the Express app, but never calls .listen() — that's
// server.js's job. Keeping the two separate lets integration tests import
// `app` directly via supertest without binding a real port (see CLAUDE.md).
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
// Side-effect import: wires up every domain-event listener (see
// events/index.js) as soon as the app module loads, so they're registered
// under `npm run dev` and under supertest alike.
import './events/index.js';

const app = express();

// Week 6 hardening, registered ahead of everything else so it applies to
// every request/response that follows:
// - helmet: a set of security-related response headers (e.g. disabling
//   X-Powered-By, blocking MIME-sniffing) that are safe defaults for a
//   JSON API and cost nothing to turn on.
// - cors: wide open for now, same reasoning as config/socket.js's Socket.IO
//   CORS setup — no deployed frontend origin to pin this to yet. Tighten
//   once the React app's dev/prod origins are known.
// - morgan('dev'): one line per request/response to the console — the
//   access log Laravel gives you for free in its own dev server.
// - generalLimiter: see middleware/rateLimiter.js.
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(generalLimiter);

app.use(express.json());

app.use(routes);

// Registered last, in order, so they see every route/middleware above them:
// unmatched requests fall through to notFound, and any forwarded/thrown
// error (including from notFound) is handled centrally by errorHandler.
app.use(notFound);
app.use(errorHandler);

export default app;
