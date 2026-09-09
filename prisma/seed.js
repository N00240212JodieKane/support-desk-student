// Dev seed data covering every relationship in the schema — not just tickets
// — so the relational shape (1:M, plain join table, attribute-carrying join
// table) is actually visible when you look at the seeded DB, even though
// only the Ticket endpoints are wired up to Prisma this week (see PLAN.md
// Week 2). Passwords are plain placeholders here; Week 4 introduces bcrypt
// hashing on write.
//
// Deletes everything (children first, to satisfy FK constraints) and
// reinserts, so this script is safe to re-run as often as you like during
// development: `npx prisma db seed`.
import prisma from '../src/config/db.js';

async function main() {
  await prisma.notification.deleteMany();
  await prisma.ticketWatcher.deleteMany();
  await prisma.ticketTag.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  const [customer1, customer2, agent1, admin] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Casey Customer',
        email: 'casey@example.com',
        password: 'placeholder-not-hashed',
        role: 'customer',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Priya Patel',
        email: 'priya@example.com',
        password: 'placeholder-not-hashed',
        role: 'customer',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Alex Agent',
        email: 'alex@example.com',
        password: 'placeholder-not-hashed',
        role: 'agent',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Admin Ada',
        email: 'ada@example.com',
        password: 'placeholder-not-hashed',
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
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
