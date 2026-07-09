const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { errorResponse } = require('../utils/apiResponse');
const courierStore = require('../../mock-servers/courierStore');

/**
 * ShippingService — fetches shipment status from Courier API (mock or real).
 */
class ShippingService {
  constructor(appConfig, retryConfig, loggingService) {
    this.config = appConfig;
    this.retryConfig = retryConfig;
    this.loggingService = loggingService;
  }

  /**
   * Fetch shipment by tracking ID.
   */
  async getShipmentByTrackingId(trackingId, requestId) {
    this.loggingService.logStep(requestId, 'Fetching shipment from Courier', {
      trackingId,
      mock: this.config.mockCourier,
    });

    if (this.config.mockCourier) {
      const shipment = courierStore.getByTrackingId(trackingId);

      if (!shipment) {
        throw errorResponse(
          'SHIPMENT_NOT_FOUND',
          `Shipment ${trackingId} not found`,
          404
        );
      }

      return shipment;
    }

    return withRetry(
      async () => {
        const response = await axios.get(
          `${this.config.courierBaseUrl}/shipments/${trackingId}`,
          { timeout: 5000 }
        );
        return response.data;
      },
      {
        maxAttempts: this.retryConfig.maxAttempts,
        delayMs: this.retryConfig.delayMs,
        onRetry: (attempt, error) => {
          this.loggingService.logDebug(requestId, 'Courier retry', {
            attempt,
            error: error.message,
          });
        },
      }
    );
  }
}

module.exports = ShippingService;
