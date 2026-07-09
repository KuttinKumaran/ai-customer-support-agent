const createSupportRoutes = require('./supportRoutes');
const createMockRoutes = require('./mockRoutes');

/**
 * Register all API routes on the Express app.
 */
function registerRoutes(app, container) {
  app.use('/api/support', createSupportRoutes(container.supportController));

  if (!container.appConfig.isProduction) {
    app.use('/api/mock', createMockRoutes());
  }
}

module.exports = registerRoutes;
