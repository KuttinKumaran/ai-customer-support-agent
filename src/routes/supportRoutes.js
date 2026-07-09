const express = require('express');
const validateSupportRequest = require('../middleware/validateRequest');

/**
 * Support API routes.
 */
function createSupportRoutes(supportController) {
  const router = express.Router();

  /**
   * @openapi
   * /api/support:
   *   post:
   *     summary: Submit a customer support request
   *     tags: [Support]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [customerName, customerMessage, orderId]
   *             properties:
   *               customerName:
   *                 type: string
   *                 example: Kumaran
   *               customerMessage:
   *                 type: string
   *                 example: My Samsung TV order hasn't arrived. Please help me.
   *               orderId:
   *                 type: string
   *                 example: ORD1001
   *     responses:
   *       200:
   *         description: Support response generated
   *       400:
   *         description: Validation error
   *       404:
   *         description: Order or shipment not found
   */
  router.post('/', validateSupportRequest, supportController.handleSupportRequest);

  return router;
}

module.exports = createSupportRoutes;
