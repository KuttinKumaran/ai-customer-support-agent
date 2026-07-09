/**
 * Intent classification prompt template.
 */
function buildIntentPrompt(customerMessage) {
  return `Classify the following customer message into one of these intents:
- order_delivery_inquiry
- refund_request
- product_inquiry
- general_complaint
- other

Customer message: "${customerMessage}"

Respond with JSON only: { "intent": "<intent>", "confidence": <0.0-1.0> }`;
}

module.exports = { buildIntentPrompt };
