const AIOrchestrator = require('../src/agents/aiOrchestrator');
const OpenAIService = require('../src/services/OpenAIService');
const RAGService = require('../src/services/RAGService');
const OrderService = require('../src/services/OrderService');
const ShippingService = require('../src/services/ShippingService');
const CompensationService = require('../src/services/CompensationService');
const PromptService = require('../src/services/PromptService');
const LoggingService = require('../src/services/LoggingService');
const appConfig = require('../src/config/app');
const retryConfig = require('../src/config/retry');

const mockAzureConfig = { useMock: true };

describe('AIOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    const loggingService = new LoggingService();
    const openAIService = new OpenAIService(mockAzureConfig, loggingService);
    const ragService = new RAGService(mockAzureConfig, openAIService, loggingService);

    orchestrator = new AIOrchestrator({
      openAIService,
      ragService,
      orderService: new OrderService(appConfig, retryConfig, loggingService),
      shippingService: new ShippingService(appConfig, retryConfig, loggingService),
      compensationService: new CompensationService(loggingService),
      promptService: new PromptService(),
      loggingService,
    });
  });

  it('processes ORD1001 delivery inquiry end-to-end', async () => {
    const result = await orchestrator.process(
      {
        customerName: 'Kumaran',
        customerMessage: "My Samsung TV order hasn't arrived. Please help me.",
        orderId: 'ORD1001',
      },
      'test-orch-1'
    );

    expect(result.customer).toBe('Kumaran');
    expect(result.orderId).toBe('ORD1001');
    expect(result.status).toBe('Delayed');
    expect(result.daysDelayed).toBe(4);
    expect(result.coupon).toBe(500);
    expect(result.refund).toBe(false);
    expect(result.intent).toBe('order_delivery_inquiry');
    expect(result.message).toContain('₹500');
  });

  it('throws for unknown order', async () => {
    await expect(
      orchestrator.process(
        {
          customerName: 'Test',
          customerMessage: 'Where is my order?',
          orderId: 'ORD9999',
        },
        'test-orch-2'
      )
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });
});
