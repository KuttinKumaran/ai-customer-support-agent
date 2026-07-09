/**
 * Date utility functions for order and shipment calculations.
 */

/**
 * Subtract days from a reference date.
 */
function subDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Calculate whole days between two dates (date1 - date2).
 */
function daysBetween(date1, date2) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d1 - d2) / msPerDay);
}

/**
 * Resolve relative date offsets from mock seed data.
 * Converts offset fields like orderDateOffsetDays into ISO date strings.
 */
function resolveDateOffsets(record, referenceDate = new Date()) {
  const resolved = { ...record };

  if (record.orderDateOffsetDays !== undefined) {
    resolved.orderDate = subDays(
      referenceDate,
      Math.abs(record.orderDateOffsetDays)
    ).toISOString();
    delete resolved.orderDateOffsetDays;
  }

  if (record.expectedDeliveryOffsetDays !== undefined) {
    resolved.expectedDelivery = subDays(
      referenceDate,
      Math.abs(record.expectedDeliveryOffsetDays)
    ).toISOString();
    delete resolved.expectedDeliveryOffsetDays;
  }

  return resolved;
}

module.exports = { subDays, daysBetween, resolveDateOffsets };
