// The in-app channel: a Notification row per event, per CLAUDE.md's domain
// events. One domainEvents.on(...) block below per event this channel
// cares about — see notifyEmail.listener.js and notifyRealtime.listener.js
// for the other two channels' take on the same events.
import domainEvents, { EVENTS } from '../emitter.js';
import prisma from '../../config/db.js';

// ticket.created -> a Notification row for the customer (confirmation) and
// one for every agent (the unassigned queue just grew).

domainEvents.on(EVENTS.TICKET_CREATED, async (ticket) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'agent' },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: [
        {
          userId: ticket.customerId,
          type: EVENTS.TICKET_CREATED,
          message: `Your ticket "${ticket.subject}" was created.`,
        },
        ...agents.map((agent) => ({
          userId: agent.id,
          type: EVENTS.TICKET_CREATED,
          message: `New ticket in the queue: "${ticket.subject}".`,
        })),
      ],
    });
  } catch (err) {
    // A listener throwing here would otherwise become an unhandled promise
    // rejection — createTicket already committed the ticket and its
    // response has already gone out, so this channel failing must never
    // affect the request, or the email/realtime listeners below it. Same
    // reasoning applies to every try/catch in this file.
    console.error('notifyInApp listener failed for ticket.created:', err);
  }
});

// ticket.assigned -> a Notification row for the newly assigned agent.
domainEvents.on(EVENTS.TICKET_ASSIGNED, async (ticket) => {
  try {
    await prisma.notification.create({
      data: {
        userId: ticket.assignedAgentId,
        type: EVENTS.TICKET_ASSIGNED,
        message: `You were assigned ticket "${ticket.subject}".`,
      },
    });
  } catch (err) {
    console.error('notifyInApp listener failed for ticket.assigned:', err);
  }
});

// ticket.commented -> a Notification row for each recipient the comment
// service already resolved (see services/comment.service.js's
// createComment) — the ticket's customer plus opted-in watchers, minus the
// comment's own author.
domainEvents.on(EVENTS.TICKET_COMMENTED, async ({ comment, ticket, recipients }) => {
  // Everything, including reading `recipients` itself, stays inside the
  // try: this is an async function, so a throw anywhere in its body before
  // the try (or outside it entirely) doesn't propagate to whoever called
  // emit() the way a synchronous throw would — it becomes an unhandled
  // promise rejection instead, which is exactly the failure mode this
  // try/catch exists to prevent.
  try {
    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map(({ id: userId }) => ({
        userId,
        type: EVENTS.TICKET_COMMENTED,
        message: `${comment.author.name} commented on "${ticket.subject}".`,
      })),
    });
  } catch (err) {
    console.error('notifyInApp listener failed for ticket.commented:', err);
  }
});

// ticket.status_changed -> a Notification row for the ticket's customer.
domainEvents.on(EVENTS.TICKET_STATUS_CHANGED, async (ticket, previousStatus) => {
  try {
    await prisma.notification.create({
      data: {
        userId: ticket.customerId,
        type: EVENTS.TICKET_STATUS_CHANGED,
        message: `Your ticket "${ticket.subject}" moved from ${previousStatus} to ${ticket.status}.`,
      },
    });
  } catch (err) {
    console.error('notifyInApp listener failed for ticket.status_changed:', err);
  }
});

// ticket.sla_breached -> a Notification row for whoever owns fixing this:
// the assigned agent if there is one, otherwise every admin (nobody's
// picked it up yet, so there's no one narrower to escalate to). See
// jobs/slaScan.job.js for what emits this and why it's never a controller.
domainEvents.on(EVENTS.TICKET_SLA_BREACHED, async (ticket) => {
  try {
    if (ticket.assignedAgentId) {
      await prisma.notification.create({
        data: {
          userId: ticket.assignedAgentId,
          type: EVENTS.TICKET_SLA_BREACHED,
          message: `Ticket "${ticket.subject}" has breached its SLA and needs attention.`,
        },
      });
      return;
    }

    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: EVENTS.TICKET_SLA_BREACHED,
        message: `Unassigned ticket "${ticket.subject}" has breached its SLA — needs an agent.`,
      })),
    });
  } catch (err) {
    console.error('notifyInApp listener failed for ticket.sla_breached:', err);
  }
});
