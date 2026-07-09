const { daysBetween } = require('../utils/dateUtils');

const COUPON_AMOUNT = 500;
const COUPON_DELAY_DAYS = 3;
const REFUND_DELAY_DAYS = 7;

/**
 * CompensationService — applies business rules for delay compensation.
 *
 * Rules:
 * - delay >= 7 days → full refund eligible
 * - delay >= 3 days → ₹500 coupon eligible
 * - else → apologize and provide expected delivery
 */
class CompensationService {
  constructor(loggingService) {
    this.loggingService = loggingService;
  }

  /**
   * Calculate days delayed from expected delivery date.
   */
  calculateDaysDelayed(expectedDelivery, referenceDate = new Date()) {
    if (!expectedDelivery) return 0;

    const days = daysBetween(referenceDate, expectedDelivery);
    return Math.max(0, days);
  }

  /**
   * Evaluate compensation based on shipment delay.
   */
  evaluate({ shipment, referenceDate = new Date() }, requestId) {
    const daysDelayed = this.calculateDaysDelayed(
      shipment.expectedDelivery,
      referenceDate
    );

    let result;

    if (shipment.status === 'DELIVERED') {
      result = {
        status: 'Delivered',
        daysDelayed: 0,
        coupon: null,
        refund: false,
        expectedDeliveryMessage: `Your order was delivered.`,
      };
    } else if (daysDelayed >= REFUND_DELAY_DAYS) {
      result = {
        status: 'Delayed',
        daysDelayed,
        coupon: null,
        refund: true,
        expectedDeliveryMessage: null,
      };
    } else if (daysDelayed >= COUPON_DELAY_DAYS) {
      result = {
        status: 'Delayed',
        daysDelayed,
        coupon: COUPON_AMOUNT,
        refund: false,
        expectedDeliveryMessage: this._buildEtaMessage(shipment),
      };
    } else {
      result = {
        status: daysDelayed > 0 ? 'Delayed' : 'On Track',
        daysDelayed,
        coupon: null,
        refund: false,
        expectedDeliveryMessage: this._buildEtaMessage(shipment),
      };
    }

    if (requestId) {
      this.loggingService.logStep(requestId, 'Compensation evaluated', {
        daysDelayed: result.daysDelayed,
        coupon: result.coupon,
        refund: result.refund,
        status: result.status,
      });
    }

    return result;
  }

  _buildEtaMessage(shipment) {
    if (!shipment.expectedDelivery) {
      return 'We are tracking your shipment and will update you shortly.';
    }

    const eta = new Date(shipment.expectedDelivery);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eta.setHours(0, 0, 0, 0);

    if (eta >= today) {
      return `Your order is expected to arrive by ${eta.toDateString()}.`;
    }

    return `Your order is in transit from ${shipment.currentLocation} and should arrive soon.`;
  }
}

module.exports = CompensationService;
