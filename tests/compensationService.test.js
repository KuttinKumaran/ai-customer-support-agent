const CompensationService = require('../src/services/CompensationService');
const LoggingService = require('../src/services/LoggingService');

describe('CompensationService', () => {
  let service;

  beforeEach(() => {
    service = new CompensationService(new LoggingService());
  });

  const makeShipment = (daysAgo, status = 'IN_TRANSIT') => ({
    trackingId: 'TRK001',
    orderId: 'ORD001',
    status,
    expectedDelivery: new Date(
      Date.now() - daysAgo * 24 * 60 * 60 * 1000
    ).toISOString(),
    currentLocation: 'Mumbai Hub',
    carrier: 'BlueDart',
  });

  it('returns On Track when not delayed', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const result = service.evaluate({
      shipment: { ...makeShipment(0), expectedDelivery: futureDate, status: 'IN_TRANSIT' },
    });

    expect(result.status).toBe('On Track');
    expect(result.daysDelayed).toBe(0);
    expect(result.coupon).toBeNull();
    expect(result.refund).toBe(false);
  });

  it('returns coupon for 3-day delay', () => {
    const result = service.evaluate({ shipment: makeShipment(3) });

    expect(result.status).toBe('Delayed');
    expect(result.daysDelayed).toBe(3);
    expect(result.coupon).toBe(500);
    expect(result.refund).toBe(false);
  });

  it('returns coupon for 4-day delay', () => {
    const result = service.evaluate({ shipment: makeShipment(4) });

    expect(result.status).toBe('Delayed');
    expect(result.daysDelayed).toBe(4);
    expect(result.coupon).toBe(500);
    expect(result.refund).toBe(false);
  });

  it('returns refund for 7-day delay', () => {
    const result = service.evaluate({ shipment: makeShipment(7) });

    expect(result.status).toBe('Delayed');
    expect(result.daysDelayed).toBe(7);
    expect(result.coupon).toBeNull();
    expect(result.refund).toBe(true);
  });

  it('returns refund for 10-day delay', () => {
    const result = service.evaluate({ shipment: makeShipment(10) });

    expect(result.daysDelayed).toBe(10);
    expect(result.refund).toBe(true);
  });

  it('returns Delivered with no compensation', () => {
    const result = service.evaluate({
      shipment: makeShipment(5, 'DELIVERED'),
    });

    expect(result.status).toBe('Delivered');
    expect(result.daysDelayed).toBe(0);
    expect(result.coupon).toBeNull();
    expect(result.refund).toBe(false);
  });
});
