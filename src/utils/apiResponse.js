/**
 * Standardized API response helpers.
 */

function successResponse(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

function errorResponse(code, message, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.status = statusCode;
  return error;
}

module.exports = { successResponse, errorResponse };
