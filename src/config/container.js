const appConfig = require('./app');
const azureConfig = require('./azure');
const retryConfig = require('./retry');

const LoggingService = require('../services/LoggingService');
const OpenAIService = require('../services/OpenAIService');
const RAGService = require('../services/RAGService');
const OrderService = require('../services/OrderService');
const ShippingService = require('../services/ShippingService');
const CompensationService = require('../services/CompensationService');
const PromptService = require('../services/PromptService');
const AIOrchestrator = require('../agents/aiOrchestrator');
const SupportController = require('../controllers/supportController');

/**
 * Dependency injection container — wires all services at startup.
 */
function createContainer() {
  const loggingService = new LoggingService();
  const promptService = new PromptService();

  const openAIService = new OpenAIService(azureConfig, loggingService);
  const ragService = new RAGService(azureConfig, openAIService, loggingService);
  const orderService = new OrderService(appConfig, retryConfig, loggingService);
  const shippingService = new ShippingService(appConfig, retryConfig, loggingService);
  const compensationService = new CompensationService(loggingService);

  const orchestrator = new AIOrchestrator({
    openAIService,
    ragService,
    orderService,
    shippingService,
    compensationService,
    promptService,
    loggingService,
  });

  const supportController = new SupportController(orchestrator);

  return {
    loggingService,
    openAIService,
    ragService,
    orderService,
    shippingService,
    compensationService,
    promptService,
    orchestrator,
    supportController,
    appConfig,
    azureConfig,
  };
}

module.exports = { createContainer };
