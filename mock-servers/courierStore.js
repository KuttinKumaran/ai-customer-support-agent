const fs = require('fs');
const path = require('path');
const { resolveDateOffsets } = require('../src/utils/dateUtils');
const Shipment = require('../src/models/shipment');

/**
 * In-memory Courier store loaded from seed JSON.
 * Supports reset and upsert for test/demo refill.
 */
class CourierStore {
  constructor() {
    this.seedPath = path.join(__dirname, '..', 'data', 'mock', 'shipments.json');
    this.shipments = [];
    this.load();
  }

  load() {
    const raw = JSON.parse(fs.readFileSync(this.seedPath, 'utf-8'));
    this.shipments = raw.map((record) => {
      const resolved = resolveDateOffsets(record);
      return new Shipment(resolved);
    });
  }

  reset() {
    this.load();
    return this.shipments.length;
  }

  getAll() {
    return this.shipments;
  }

  getByTrackingId(trackingId) {
    return this.shipments.find((s) => s.trackingId === trackingId) || null;
  }

  getByOrderId(orderId) {
    return this.shipments.find((s) => s.orderId === orderId) || null;
  }

  upsert(shipmentData) {
    const resolved = resolveDateOffsets(shipmentData);
    const index = this.shipments.findIndex(
      (s) => s.trackingId === resolved.trackingId
    );

    if (index >= 0) {
      this.shipments[index] = new Shipment(resolved);
    } else {
      this.shipments.push(new Shipment(resolved));
    }

    return this.shipments.find((s) => s.trackingId === resolved.trackingId);
  }
}

module.exports = new CourierStore();
