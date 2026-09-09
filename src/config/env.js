// Loads .env into process.env and validates it once at startup, so a missing
// or malformed value fails fast with a clear message here — instead of
// surfacing later as a confusing runtime error (e.g. the server silently
// listening on the wrong port, or `NaN`). Week 1/2 did this with a plain
// manual check; now that Zod is in the project for request validation
// (middleware/validate.js), the same tool validates config too — a schema
// is a schema, whether it's describing a request body or process.env.
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Week 4: signs/verifies this API's JWTs (middleware/authenticate.js) — a
  // short or missing secret would let tokens be forged, so this fails fast
  // at startup rather than quietly accepting a weak one.
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  // Week 5: nodemailer's SMTP target. Defaults match the `mailpit` service in
  // docker-compose.yml — a local dev mail catcher, not a real mail server
  // (see "Dev email" in PLAN.md's Key decisions). Read what was "sent" at
  // http://localhost:8025 instead of any real inbox.
  MAIL_HOST: z.string().min(1).default('localhost'),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().min(1).default('Support Desk <support@example.test>'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const problems = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration — ${problems}`);
}

export default result.data;
