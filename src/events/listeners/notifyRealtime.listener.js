// The realtime channel: each event pushed live over Socket.IO to whichever
// room(s) it's relevant to, so a connected client updates instantly instead
// of polling — see config/socket.js for how a socket ends up in a room, and
// "Real-time notification delivery" in PLAN.md's Key decisions. Same one
// domainEvents.on(...) block per event as the other two listener files.
import domainEvents, { EVENTS } from '../emitter.js';
import { getIO } from '../../config/socket.js';

// Not running under a real server — e.g. a test importing app.js directly
// via supertest (see CLAUDE.md's app.js/server.js split) never calls
// initSocket(). No realtime channel to push over in that case, so every
// handler below bails out quietly on a missing `io` rather than throwing.
//
// Unlike the other two listener files these handlers aren't async, so a
// throw here propagates synchronously back through emit() rather than
// becoming an unhandled promise rejection — but it would still stop
// EventEmitter from calling any listener registered after this one for the
// same event (registration order in events/index.js). Wrapped in try/catch
// anyway so this channel failing can never affect another, regardless of
// registration order.

// ticket.created -> the customer (their own room) and every connected
// agent (the shared `role:agent` room).
domainEvents.on(EVENTS.TICKET_CREATED, (ticket) => {
  try {
    const io = getIO();
    if (!io) return;

    io.to(`user:${ticket.customerId}`).emit(EVENTS.TICKET_CREATED, ticket);
    io.to('role:agent').emit(EVENTS.TICKET_CREATED, ticket);
  } catch (err) {
    console.error('notifyRealtime listener failed for ticket.created:', err);
  }
});

// ticket.assigned -> the newly assigned agent.
domainEvents.on(EVENTS.TICKET_ASSIGNED, (ticket) => {
  try {
    const io = getIO();
    if (!io) return;

    io.to(`user:${ticket.assignedAgentId}`).emit(EVENTS.TICKET_ASSIGNED, ticket);
  } catch (err) {
    console.error('notifyRealtime listener failed for ticket.assigned:', err);
  }
});

// ticket.commented -> each recipient the comment service already resolved
// (see services/comment.service.js's createComment).
domainEvents.on(EVENTS.TICKET_COMMENTED, ({ comment, ticket, recipients }) => {
  try {
    const io = getIO();
    if (!io) return;

    for (const recipient of recipients) {
      io.to(`user:${recipient.id}`).emit(EVENTS.TICKET_COMMENTED, { comment, ticket });
    }
  } catch (err) {
    console.error('notifyRealtime listener failed for ticket.commented:', err);
  }
});

// ticket.status_changed -> the ticket's customer.
domainEvents.on(EVENTS.TICKET_STATUS_CHANGED, (ticket, previousStatus) => {
  try {
    const io = getIO();
    if (!io) return;

    io.to(`user:${ticket.customerId}`).emit(EVENTS.TICKET_STATUS_CHANGED, { ticket, previousStatus });
  } catch (err) {
    console.error('notifyRealtime listener failed for ticket.status_changed:', err);
  }
});
