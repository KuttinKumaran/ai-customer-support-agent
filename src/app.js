const express = require('express');
const swaggerUi = require('swagger-ui-express');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const registerRoutes = require('./routes');
const swaggerSpec = require('./config/swagger');
const { createContainer } = require('./config/container');

/**
 * Create and configure the Express application.
 */
function createApp() {
  const app = express();
  const container = createContainer();

  app.use(express.json());
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        mockAzure: container.azureConfig.useMock,
        mockOms: container.appConfig.mockOms,
        mockCourier: container.appConfig.mockCourier,
        ragIndexSize: container.ragService.getIndexSize(),
      },
    });
  });

  // Swagger API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // API routes
  registerRoutes(app, container);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
