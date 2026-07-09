const logger = require('../config/logger');

/**
 * Global error handler — maps errors to standardized API responses.
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  logger.error('Request error', {
    requestId: req.requestId,
    code,
    message,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: { code, message },
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = errorHandler;
