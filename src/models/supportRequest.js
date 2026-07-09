/**
 * Support request model — shape of POST /api/support body.
 */
class SupportRequest {
  constructor({ customerName, customerMessage, orderId }) {
    this.customerName = customerName;
    this.customerMessage = customerMessage;
    this.orderId = orderId;
  }

  static fromBody(body) {
    return new SupportRequest({
      customerName: body.customerName,
      customerMessage: body.customerMessage,
      orderId: body.orderId,
    });
  }
}

module.exports = SupportRequest;
