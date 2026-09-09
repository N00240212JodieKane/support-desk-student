// The bus behind "domain events" in CLAUDE.md's Architecture conventions:
// a service emits onto this one shared EventEmitter right after the state
// change it describes actually happened; listeners (events/listeners/*)
// each subscribe independently, so removing, adding, or breaking one
// listener (e.g. email) never touches the others (in-app, realtime) or the
// service/controller code that fired the event in the first place.
//
// Same "import = singleton" idiom as config/db.js's PrismaClient and
// config/mailer.js's transport — every importer shares this one instance.
import { EventEmitter } from 'node:events';

const domainEvents = new EventEmitter();

export default domainEvents;

// Event names as a single source of truth: a typo in an .emit()/.on() call
// becomes an import error instead of a listener that silently never fires.
// One entry per domain event (see CLAUDE.md's "Domain events" and PLAN.md's
// Week 5) — who emits each and what payload it carries is documented at
// each emit() call site (services/ticket.service.js,
// services/comment.service.js), not repeated here.
export const EVENTS = {
  TICKET_CREATED: 'ticket.created',
  TICKET_ASSIGNED: 'ticket.assigned',
  TICKET_COMMENTED: 'ticket.commented',
  TICKET_STATUS_CHANGED: 'ticket.status_changed',
  // Week 6: emitted by services/ticket.service.js's escalateOverdueTickets,
  // called only from jobs/slaScan.job.js — the one emit() in this project
  // that a request never triggers. See jobs/slaScan.job.js and "the
  // cross-process realtime gap" topic for why this event's payload reaches
  // two of the three notification channels but not the third.
  TICKET_SLA_BREACHED: 'ticket.sla_breached',
};
