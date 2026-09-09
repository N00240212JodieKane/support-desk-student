// Dev seed data covering every relationship in the schema — not just tickets
// — so the relational shape (1:M, plain join table, attribute-carrying join
// table) is actually visible when you look at the seeded DB, even though
// only the Ticket endpoints were wired up to Prisma in Week 2. Week 4 swaps
// the plain-placeholder passwords for real bcrypt hashes, via the exact
// same hashPassword() the register endpoint itself uses — so every seeded
// user is a real account you can log in as (see the login topic for the
// shared dev password).
//
// Deletes everything (children first, to satisfy FK constraints) and
// reinserts, so this script is safe to re-run as often as you like during
// development: `npx prisma db seed`.
import prisma from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';

// Every seeded user shares this password — fine for a dev/demo database
// nobody else can reach, never something to do against a real one.
const DEV_PASSWORD = 'password123';

async function main() {
  await prisma.notification.deleteMany();
  await prisma.ticketWatcher.deleteMany();
  await prisma.ticketTag.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await hashPassword(DEV_PASSWORD);

  const [customer1, customer2, agent1, admin] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Casey Customer',
        email: 'casey@example.com',
        password: hashedPassword,
        role: 'customer',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Priya Patel',
        email: 'priya@example.com',
        password: hashedPassword,
        role: 'customer',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Alex Agent',
        email: 'alex@example.com',
        password: hashedPassword,
        role: 'agent',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Admin Ada',
        email: 'ada@example.com',
        password: hashedPassword,
        role: 'admin',
      },
    }),
  ]);

  const [bugTag, billingTag] = await Promise.all([
    prisma.tag.create({ data: { name: 'bug' } }),
    prisma.tag.create({ data: { name: 'billing' } }),
  ]);

  const loginTicket = await prisma.ticket.create({
    data: {
      subject: 'Cannot log in',
      description: 'Password reset email never arrives',
      status: 'open',
      customerId: customer1.id,
      assignedAgentId: agent1.id,
    },
  });

  const invoiceTicket = await prisma.ticket.create({
    data: {
      subject: 'Invoice discrepancy',
      description: 'Charged twice for March',
      status: 'open',
      customerId: customer2.id,
    },
  });

  // Week 6: both deliberately backdated well past SLA_BREACH_HOURS's
  // default (24h) and still `open`, so jobs/slaScan.job.js has something to
  // find on its very first run instead of you needing to wait a day —
  // covers both escalation paths in events/listeners/notifyInApp.listener.js:
  // one has an agent to escalate to, the other doesn't.
  const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const overdueAssignedTicket = await prisma.ticket.create({
    data: {
      subject: 'Export button does nothing',
      description: 'Clicking "Export CSV" on the reports page has no effect',
      status: 'open',
      customerId: customer1.id,
      assignedAgentId: agent1.id,
      createdAt: TWO_DAYS_AGO,
    },
  });

  const overdueUnassignedTicket = await prisma.ticket.create({
    data: {
      subject: 'Dashboard shows wrong currency',
      description: 'Amounts display in USD instead of EUR',
      status: 'open',
      customerId: customer2.id,
      createdAt: TWO_DAYS_AGO,
    },
  });

  await prisma.ticketTag.createMany({
    data: [
      { ticketId: loginTicket.id, tagId: bugTag.id },
      { ticketId: invoiceTicket.id, tagId: billingTag.id },
    ],
  });

  await prisma.comment.create({
    data: {
      ticketId: loginTicket.id,
      authorId: agent1.id,
      body: 'Looking into this now — can you confirm which email address you used?',
    },
  });

  await prisma.ticketWatcher.createMany({
    data: [
      { ticketId: loginTicket.id, userId: customer1.id, notifyOnComment: true },
      { ticketId: invoiceTicket.id, userId: admin.id, notifyOnComment: false },
    ],
  });

  await prisma.notification.create({
    data: {
      userId: agent1.id,
      type: 'ticket.assigned',
      message: `Ticket #${loginTicket.id} was assigned to you`,
    },
  });

  console.log('Seed complete.');
  console.log(`Every seeded user's password is "${DEV_PASSWORD}" — e.g. POST /auth/login with casey@example.com.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
