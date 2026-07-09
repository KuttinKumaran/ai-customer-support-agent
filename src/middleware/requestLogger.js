const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Attaches a unique request ID to every incoming request for tracing.
 */
function requestLogger(req, res, next) {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  req.startTime = Date.now();

  res.setHeader('X-Request-Id', req.requestId);

  logger.info('Request received', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.on('finish', () => {
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - req.startTime,
    });
  });

  next();
}

module.exports = requestLogger;
