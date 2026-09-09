// The email channel, via Mailpit (see config/mailer.js and "Dev email" in
// PLAN.md's Key decisions) rather than a real mail server. Same one
// domainEvents.on(...) block per event as notifyInApp.listener.js.
import domainEvents, { EVENTS } from '../emitter.js';
import mailer from '../../config/mailer.js';
import env from '../../config/env.js';

// ticket.created -> a confirmation email to the customer.

domainEvents.on(EVENTS.TICKET_CREATED, async (ticket) => {
  try {
    await mailer.sendMail({
      from: env.MAIL_FROM,
      to: ticket.customer.email,
      subject: `Ticket #${ticket.id} created: ${ticket.subject}`,
      text: `Hi ${ticket.customer.name},\n\nWe've received your ticket and an agent will respond shortly.\n\n"${ticket.subject}"\n${ticket.description}`,
    });
  } catch (err) {
    // Same reasoning as notifyInApp.listener.js: never let this channel's
    // failure surface as an unhandled rejection or affect the other two.
    // Same reasoning applies to every try/catch in this file.
    console.error('notifyEmail listener failed for ticket.created:', err);
  }
});

// ticket.assigned -> an email to the newly assigned agent.
domainEvents.on(EVENTS.TICKET_ASSIGNED, async (ticket) => {
  try {
    await mailer.sendMail({
      from: env.MAIL_FROM,
      to: ticket.assignedAgent.email,
      subject: `Ticket #${ticket.id} assigned to you: ${ticket.subject}`,
      text: `Hi ${ticket.assignedAgent.name},\n\nYou've been assigned ticket "${ticket.subject}".\n\n${ticket.description}`,
    });
  } catch (err) {
    console.error('notifyEmail listener failed for ticket.assigned:', err);
  }
});

// ticket.commented -> an email to each recipient the comment service
// already resolved (see services/comment.service.js's createComment).
domainEvents.on(EVENTS.TICKET_COMMENTED, async ({ comment, ticket, recipients }) => {
  // See notifyInApp.listener.js's TICKET_COMMENTED handler: everything,
  // including reading `recipients`, stays inside the try for the same
  // reason — an async function's throw doesn't propagate to emit()'s
  // caller, it becomes an unhandled rejection instead.
  try {
    if (recipients.length === 0) return;

    await Promise.all(
      recipients.map((recipient) =>
        mailer.sendMail({
          from: env.MAIL_FROM,
          to: recipient.email,
          subject: `New comment on ticket #${ticket.id}: ${ticket.subject}`,
          text: `Hi ${recipient.name},\n\n${comment.author.name} commented on "${ticket.subject}":\n\n${comment.body}`,
        })
      )
    );
  } catch (err) {
    console.error('notifyEmail listener failed for ticket.commented:', err);
  }
});

// ticket.status_changed -> an email to the ticket's customer.
domainEvents.on(EVENTS.TICKET_STATUS_CHANGED, async (ticket, previousStatus) => {
  try {
    await mailer.sendMail({
      from: env.MAIL_FROM,
      to: ticket.customer.email,
      subject: `Ticket #${ticket.id} status changed: ${ticket.subject}`,
      text: `Hi ${ticket.customer.name},\n\nYour ticket "${ticket.subject}" moved from ${previousStatus} to ${ticket.status}.`,
    });
  } catch (err) {
    console.error('notifyEmail listener failed for ticket.status_changed:', err);
  }
});

// ticket.sla_breached -> an email to the assigned agent. Deliberately no
// email branch for the unassigned case (unlike notifyInApp.listener.js's
// admin fan-out) — an inbox-full-of-admins is the kind of alert fatigue
// that gets filtered/ignored; the in-app + realtime channels already
// surface it there.
domainEvents.on(EVENTS.TICKET_SLA_BREACHED, async (ticket) => {
  try {
    if (!ticket.assignedAgentId) return;

    await mailer.sendMail({
      from: env.MAIL_FROM,
      to: ticket.assignedAgent.email,
      subject: `SLA breached: ticket #${ticket.id} needs attention`,
      text: `Hi ${ticket.assignedAgent.name},\n\nTicket "${ticket.subject}" has been open past its SLA threshold and needs attention.`,
    });
  } catch (err) {
    console.error('notifyEmail listener failed for ticket.sla_breached:', err);
  }
});
