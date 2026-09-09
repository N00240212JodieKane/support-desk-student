// A single shared nodemailer transport for the whole app — same "import =
// singleton" idiom as config/db.js's PrismaClient (see CLAUDE.md).
//
// Points at Mailpit (docker-compose.yml's `mailpit` service), a local SMTP
// dev inbox: mail sent here never leaves the machine and never reaches a
// real address, but is readable at http://localhost:8025 — see "Dev email"
// in PLAN.md's Key decisions for why this replaced Ethereal/Mailtrap.
// Swapping to a real provider later (e.g. for a production deploy) is a
// matter of pointing these env vars at it — nothing above this module
// changes.
import nodemailer from 'nodemailer';
import env from './env.js';

const transport = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  // Mailpit doesn't speak TLS on :1025 and needs no auth — both of which a
  // real provider (or a hardened SMTP server) would require instead.
  secure: false,
});

export default transport;
