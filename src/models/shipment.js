/**
 * Shipment model — represents courier tracking data.
 */
class Shipment {
  constructor({
    trackingId,
    orderId,
    status,
    expectedDelivery,
    currentLocation,
    carrier,
  }) {
    this.trackingId = trackingId;
    this.orderId = orderId;
    this.status = status;
    this.expectedDelivery = expectedDelivery;
    this.currentLocation = currentLocation;
    this.carrier = carrier;
  }
}

module.exports = Shipment;
