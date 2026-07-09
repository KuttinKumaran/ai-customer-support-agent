const logger = require('../config/logger');

/**
 * LoggingService — wraps winston for request-scoped orchestration tracing.
 */
class LoggingService {
  /**
   * Log a step in the AI orchestration pipeline.
   */
  logStep(requestId, step, data = {}) {
    logger.info(`[Orchestrator] ${step}`, {
      requestId,
      step,
      ...data,
    });
  }

  logError(requestId, step, error) {
    logger.error(`[Orchestrator] ${step} failed`, {
      requestId,
      step,
      error: error.message,
      stack: error.stack,
    });
  }

  logDebug(requestId, message, data = {}) {
    logger.debug(message, { requestId, ...data });
  }
}

module.exports = LoggingService;
