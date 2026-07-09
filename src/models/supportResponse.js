/**
 * Support response model — shape of the API success payload.
 */
class SupportResponse {
  constructor({
    customer,
    orderId,
    status,
    daysDelayed,
    coupon = null,
    refund = false,
    message,
    intent = null,
  }) {
    this.customer = customer;
    this.orderId = orderId;
    this.status = status;
    this.daysDelayed = daysDelayed;
    this.coupon = coupon;
    this.refund = refund;
    this.message = message;
    this.intent = intent;
  }

  toJSON() {
    const payload = {
      customer: this.customer,
      orderId: this.orderId,
      status: this.status,
      daysDelayed: this.daysDelayed,
      message: this.message,
    };

    if (this.coupon) payload.coupon = this.coupon;
    if (this.refund) payload.refund = this.refund;
    if (this.intent) payload.intent = this.intent;

    return payload;
  }
}

module.exports = SupportResponse;
