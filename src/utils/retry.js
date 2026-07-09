/**
 * Retry utility with exponential backoff for external API calls.
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes an async function with retries on failure.
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum retry attempts
 * @param {number} options.delayMs - Base delay between retries (ms)
 * @param {Function} options.onRetry - Optional callback on retry
 */
async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  const delayMs = options.delayMs || 1000;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) break;

      if (options.onRetry) {
        options.onRetry(attempt, error);
      }

      await sleep(delayMs * Math.pow(2, attempt - 1));
    }
  }

  throw lastError;
}

module.exports = { withRetry, sleep };
