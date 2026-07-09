const SupportRequest = require('../models/supportRequest');
const SupportResponse = require('../models/supportResponse');

/**
 * AIOrchestrator — coordinates the full support request pipeline.
 *
 * Flow:
 * 1. Classify intent (OpenAI)
 * 2. Retrieve policies (RAG)
 * 3. Fetch order (OMS)
 * 4. Fetch shipment (Courier)
 * 5. Evaluate compensation (Business rules)
 * 6. Generate response (OpenAI)
 */
class AIOrchestrator {
  constructor({
    openAIService,
    ragService,
    orderService,
    shippingService,
    compensationService,
    promptService,
    loggingService,
  }) {
    this.openAIService = openAIService;
    this.ragService = ragService;
    this.orderService = orderService;
    this.shippingService = shippingService;
    this.compensationService = compensationService;
    this.promptService = promptService;
    this.loggingService = loggingService;
  }

  async process(supportRequest, requestId) {
    const request = SupportRequest.fromBody(supportRequest);

    this.loggingService.logStep(requestId, 'Pipeline started', {
      orderId: request.orderId,
      customerName: request.customerName,
    });

    // Step 1: Classify customer intent
    const intentResult = await this.openAIService.classifyIntent(
      request.customerMessage,
      requestId
    );

    this.loggingService.logStep(requestId, 'Intent classified', intentResult);

    // Step 2: Retrieve relevant policy documents via RAG
    const policyChunks = await this.ragService.search(
      request.customerMessage,
      requestId
    );

    const policyContext = this.promptService.formatPolicyContext(policyChunks);

    // Step 3: Fetch order details from OMS
    const order = await this.orderService.getOrderById(request.orderId, requestId);

    // Step 4: Fetch shipment status from Courier
    const shipment = await this.shippingService.getShipmentByTrackingId(
      order.trackingId,
      requestId
    );

    // Step 5: Apply compensation business rules
    const compensation = this.compensationService.evaluate(
      { shipment },
      requestId
    );

    // Step 6: Build prompt and generate customer response
    const responsePrompt = this.promptService.buildResponsePrompt({
      customerName: request.customerName,
      customerMessage: request.customerMessage,
      intent: intentResult.intent,
      policyContext,
      order,
      shipment,
      compensation,
    });

    const message = await this.openAIService.generateResponse(
      responsePrompt,
      requestId
    );

    this.loggingService.logStep(requestId, 'Pipeline completed', {
      status: compensation.status,
      daysDelayed: compensation.daysDelayed,
    });

    return new SupportResponse({
      customer: request.customerName,
      orderId: request.orderId,
      status: compensation.status,
      daysDelayed: compensation.daysDelayed,
      coupon: compensation.coupon,
      refund: compensation.refund,
      message,
      intent: intentResult.intent,
    });
  }
}

module.exports = AIOrchestrator;
