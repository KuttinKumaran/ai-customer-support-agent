/**
 * Azure OpenAI and Azure AI Search configuration.
 */
const appConfig = require('./app');

const azureConfig = {
  openai: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    embeddingDeployment:
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
  },
  search: {
    endpoint: process.env.AZURE_SEARCH_ENDPOINT || '',
    apiKey: process.env.AZURE_SEARCH_API_KEY || '',
    indexName: process.env.AZURE_SEARCH_INDEX_NAME || 'samsung-policies',
  },
};

/**
 * Determines whether to use mock Azure services.
 * In production, missing credentials cause a hard failure.
 */
function shouldUseMockAzure() {
  if (appConfig.mockAzure) return true;

  const hasOpenAI =
    azureConfig.openai.endpoint && azureConfig.openai.apiKey;
  const hasSearch =
    azureConfig.search.endpoint && azureConfig.search.apiKey;

  if (!hasOpenAI || !hasSearch) {
    if (appConfig.isProduction) {
      throw new Error(
        'Azure credentials are required in production. Set AZURE_OPENAI_* and AZURE_SEARCH_* env vars.'
      );
    }
    return true;
  }

  return false;
}

azureConfig.useMock = shouldUseMockAzure();

module.exports = azureConfig;
