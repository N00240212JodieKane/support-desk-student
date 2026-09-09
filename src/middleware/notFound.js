// Catches any request that didn't match a route registered above this
// middleware. Must be mounted after all routes and before the error handler.
export default (req, res, next) => {
  res.status(404).json({
    error: { message: `Not found: ${req.method} ${req.originalUrl}` },
  });
};
