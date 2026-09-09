// Builds and exports the Express app, but never calls .listen() — that's
// server.js's job. Keeping the two separate lets integration tests import
// `app` directly via supertest without binding a real port (see CLAUDE.md).
import express from 'express';
import routes from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
// Side-effect import: wires up every domain-event listener (see
// events/index.js) as soon as the app module loads, so they're registered
// under `npm run dev` and under supertest alike.
import './events/index.js';

const app = express();

app.use(express.json());

app.use(routes);

// Registered last, in order, so they see every route/middleware above them:
// unmatched requests fall through to notFound, and any forwarded/thrown
// error (including from notFound) is handled centrally by errorHandler.
app.use(notFound);
app.use(errorHandler);

export default app;
