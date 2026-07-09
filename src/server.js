require('dotenv').config();

const createApp = require('./app');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;
const app = createApp();

const server = app.listen(PORT, () => {
  logger.info(`AI Customer Support Agent started on port ${PORT}`, {
    env: process.env.NODE_ENV || 'development',
    port: PORT,
    mockAzure: process.env.MOCK_AZURE !== 'false',
    docs: `http://localhost:${PORT}/api-docs`,
  });
});

const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
