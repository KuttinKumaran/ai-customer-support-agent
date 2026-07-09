const RAGService = require('../src/services/RAGService');
const OpenAIService = require('../src/services/OpenAIService');
const LoggingService = require('../src/services/LoggingService');

const mockAzureConfig = { useMock: true };

describe('RAGService', () => {
  let ragService;

  beforeEach(() => {
    const loggingService = new LoggingService();
    const openAIService = new OpenAIService(mockAzureConfig, loggingService);
    ragService = new RAGService(mockAzureConfig, openAIService, loggingService);
  });

  it('loads policy documents into mock index', () => {
    expect(ragService.getIndexSize()).toBeGreaterThan(0);
  });

  it('returns relevant policy chunks for delivery inquiry', async () => {
    const chunks = await ragService.search(
      'My order has not arrived, is there a coupon for delay?',
      'test-req-1'
    );

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toHaveProperty('title');
    expect(chunks[0]).toHaveProperty('content');
  });

  it('returns refund policy for refund query', async () => {
    const chunks = await ragService.search(
      'I want a refund for my delayed order',
      'test-req-2'
    );

    const hasRefundContent = chunks.some(
      (c) =>
        c.content.toLowerCase().includes('refund') ||
        c.title.toLowerCase().includes('refund')
    );
    expect(hasRefundContent).toBe(true);
  });
});
