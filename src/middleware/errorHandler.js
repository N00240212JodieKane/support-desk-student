// Centralised error handler — the single place that turns a thrown/forwarded
// error into a JSON response, instead of a try/catch in every controller.
// Must be registered last, after all routes and other middleware.
export default (err, req, res, next) => {
  const status = err.status || 500;

  res.status(status).json({
    error: { message: err.message || 'Internal Server Error' },
  });
};
