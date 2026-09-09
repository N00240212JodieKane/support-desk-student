// Loads .env into process.env and validates it once at startup, so a missing
// or malformed value fails fast with a clear message here — instead of
// surfacing later as a confusing runtime error (e.g. the server silently
// listening on the wrong port, or `NaN`). Real schema-based validation (Zod)
// arrives in Week 3 — see PLAN.md; for now this is the same plain manual-check
// style as ticket.controller.js.
import 'dotenv/config';

const port = Number(process.env.PORT);

if (!process.env.PORT || Number.isNaN(port)) {
  throw new Error('Missing or invalid PORT in .env — expected a number');
}

export default { PORT: port };
