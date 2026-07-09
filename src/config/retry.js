/**
 * Retry configuration for external API calls.
 */
const retryConfig = {
  maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS, 10) || 3,
  delayMs: parseInt(process.env.RETRY_DELAY_MS, 10) || 1000,
};

module.exports = retryConfig;
