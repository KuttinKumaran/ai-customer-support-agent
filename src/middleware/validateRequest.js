const { errorResponse } = require('../utils/apiResponse');

/**
 * Validates POST /api/support request body.
 */
function validateSupportRequest(req, res, next) {
  const { customerName, customerMessage, orderId } = req.body || {};
  const errors = [];

  if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
    errors.push('customerName is required and must be a non-empty string');
  }

  if (
    !customerMessage ||
    typeof customerMessage !== 'string' ||
    !customerMessage.trim()
  ) {
    errors.push('customerMessage is required and must be a non-empty string');
  }

  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    errors.push('orderId is required and must be a non-empty string');
  }

  if (errors.length > 0) {
    return next(
      errorResponse('VALIDATION_ERROR', errors.join('; '), 400)
    );
  }

  req.body = {
    customerName: customerName.trim(),
    customerMessage: customerMessage.trim(),
    orderId: orderId.trim(),
  };

  next();
}

module.exports = validateSupportRequest;
