// Registers every listener by importing each file for its side effect
// (each one calls domainEvents.on(...) at module load). Imported once from
// app.js so listeners are wired up the moment the app module is loaded —
// including under supertest, which imports app.js directly without ever
// calling server.js's .listen() (see CLAUDE.md's app.js/server.js split).
import './listeners/notifyInApp.listener.js';
import './listeners/notifyEmail.listener.js';
import './listeners/notifyRealtime.listener.js';
