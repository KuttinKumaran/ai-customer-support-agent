const express = require('express');
const appConfig = require('../config/app');
const omsStore = require('../../mock-servers/omsStore');
const courierStore = require('../../mock-servers/courierStore');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Mock admin routes for OMS and Courier data refill (dev/test only).
 */
function createMockRoutes() {
  const router = express.Router();

  if (appConfig.isProduction) {
    return router;
  }

  // --- OMS Mock Routes ---

  router.get('/oms/orders', (_req, res) => {
    res.json(successResponse(omsStore.getAll()));
  });

  router.get('/oms/orders/:orderId', (req, res, next) => {
    const order = omsStore.getByOrderId(req.params.orderId);
    if (!order) {
      return next(errorResponse('ORDER_NOT_FOUND', `Order ${req.params.orderId} not found`, 404));
    }
    res.json(successResponse(order));
  });

  router.post('/oms/reset', (_req, res) => {
    const count = omsStore.reset();
    res.json(successResponse({ message: 'OMS data reset', orderCount: count }));
  });

  router.post('/oms/orders', (req, res) => {
    const order = omsStore.upsert(req.body);
    res.status(201).json(successResponse(order));
  });

  // --- Courier Mock Routes ---

  router.get('/courier/shipments', (_req, res) => {
    res.json(successResponse(courierStore.getAll()));
  });

  router.get('/courier/shipments/:trackingId', (req, res, next) => {
    const shipment = courierStore.getByTrackingId(req.params.trackingId);
    if (!shipment) {
      return next(
        errorResponse('SHIPMENT_NOT_FOUND', `Shipment ${req.params.trackingId} not found`, 404)
      );
    }
    res.json(successResponse(shipment));
  });

  router.post('/courier/reset', (_req, res) => {
    const count = courierStore.reset();
    res.json(successResponse({ message: 'Courier data reset', shipmentCount: count }));
  });

  router.post('/courier/shipments', (req, res) => {
    const shipment = courierStore.upsert(req.body);
    res.status(201).json(successResponse(shipment));
  });

  return router;
}

module.exports = createMockRoutes;
