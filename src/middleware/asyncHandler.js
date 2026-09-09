// Wraps an async route handler so a rejected promise reaches Express's error
// handling middleware via next(err), instead of crashing the process with an
// unhandled rejection. Express itself only catches *thrown* errors in sync
// handlers — it doesn't await async ones, so this is the standard workaround.
export default (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
