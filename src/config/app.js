/**
 * Application configuration loaded from environment variables.
 */
const appConfig = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  mockAzure: process.env.MOCK_AZURE !== 'false',
  mockOms: process.env.MOCK_OMS !== 'false',
  mockCourier: process.env.MOCK_COURIER !== 'false',

  omsBaseUrl: process.env.OMS_BASE_URL || 'http://localhost:3001',
  courierBaseUrl: process.env.COURIER_BASE_URL || 'http://localhost:3002',
};

module.exports = appConfig;
