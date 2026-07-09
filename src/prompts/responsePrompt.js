/**
 * Customer response generation prompt template.
 */
function buildResponsePrompt({
  customerName,
  customerMessage,
  intent,
  policyContext,
  order,
  shipment,
  compensation,
}) {
  return `Generate a customer-friendly support response for Samsung D2C.

Customer Name: ${customerName}
Customer Message: "${customerMessage}"
Detected Intent: ${intent}

Order Details:
- Order ID: ${order.orderId}
- Product: ${order.product}
- Order Date: ${order.orderDate}
- Status: ${order.status}

Shipment Details:
- Tracking ID: ${shipment.trackingId}
- Status: ${shipment.status}
- Expected Delivery: ${shipment.expectedDelivery}
- Current Location: ${shipment.currentLocation}
- Days Delayed: ${compensation.daysDelayed}

Company Policies (from knowledge base):
${policyContext}

Compensation Decision:
- Delivery Status: ${compensation.status}
- Coupon Eligible: ${compensation.coupon ? `Yes, ₹${compensation.coupon}` : 'No'}
- Refund Eligible: ${compensation.refund ? 'Yes' : 'No'}
- Expected Delivery Message: ${compensation.expectedDeliveryMessage || 'N/A'}

Write a concise, empathetic response (2-4 sentences) that:
1. Acknowledges the customer's concern
2. Provides order/shipment status
3. Offers compensation if eligible per policy
4. Sets clear expectations for delivery`;
}

module.exports = { buildResponsePrompt };
