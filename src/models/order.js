/**
 * Order model — represents an order from the OMS.
 */
class Order {
  constructor({
    orderId,
    customerName,
    product,
    orderDate,
    status,
    amount,
    trackingId,
  }) {
    this.orderId = orderId;
    this.customerName = customerName;
    this.product = product;
    this.orderDate = orderDate;
    this.status = status;
    this.amount = amount;
    this.trackingId = trackingId;
  }
}

module.exports = Order;
