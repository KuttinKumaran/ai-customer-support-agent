const fs = require('fs');
const path = require('path');
const { resolveDateOffsets } = require('../src/utils/dateUtils');
const Order = require('../src/models/order');

/**
 * In-memory OMS store loaded from seed JSON.
 * Supports reset and upsert for test/demo refill.
 */
class OmsStore {
  constructor() {
    this.seedPath = path.join(__dirname, '..', 'data', 'mock', 'orders.json');
    this.orders = [];
    this.load();
  }

  load() {
    const raw = JSON.parse(fs.readFileSync(this.seedPath, 'utf-8'));
    this.orders = raw.map((record) => {
      const resolved = resolveDateOffsets(record);
      return new Order(resolved);
    });
  }

  reset() {
    this.load();
    return this.orders.length;
  }

  getAll() {
    return this.orders;
  }

  getByOrderId(orderId) {
    return this.orders.find((o) => o.orderId === orderId) || null;
  }

  getByTrackingId(trackingId) {
    return this.orders.find((o) => o.trackingId === trackingId) || null;
  }

  upsert(orderData) {
    const resolved = resolveDateOffsets(orderData);
    const index = this.orders.findIndex((o) => o.orderId === resolved.orderId);

    if (index >= 0) {
      this.orders[index] = new Order(resolved);
    } else {
      this.orders.push(new Order(resolved));
    }

    return this.orders.find((o) => o.orderId === resolved.orderId);
  }
}

module.exports = new OmsStore();
