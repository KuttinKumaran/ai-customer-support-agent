const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { errorResponse } = require('../utils/apiResponse');
const omsStore = require('../../mock-servers/omsStore');

/**
 * OrderService — fetches order details from OMS (mock or real API).
 */
class OrderService {
  constructor(appConfig, retryConfig, loggingService) {
    this.config = appConfig;
    this.retryConfig = retryConfig;
    this.loggingService = loggingService;
  }

  /**
   * Fetch order by order ID.
   */
  async getOrderById(orderId, requestId) {
    this.loggingService.logStep(requestId, 'Fetching order from OMS', {
      orderId,
      mock: this.config.mockOms,
    });

    if (this.config.mockOms) {
      const order = omsStore.getByOrderId(orderId);

      if (!order) {
        throw errorResponse('ORDER_NOT_FOUND', `Order ${orderId} not found`, 404);
      }

      return order;
    }

    return withRetry(
      async () => {
        const response = await axios.get(
          `${this.config.omsBaseUrl}/orders/${orderId}`,
          { timeout: 5000 }
        );
        return response.data;
      },
      {
        maxAttempts: this.retryConfig.maxAttempts,
        delayMs: this.retryConfig.delayMs,
        onRetry: (attempt, error) => {
          this.loggingService.logDebug(requestId, 'OMS retry', {
            attempt,
            error: error.message,
          });
        },
      }
    );
  }
}

module.exports = OrderService;
