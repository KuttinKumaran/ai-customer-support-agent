/**
 * Seed policy documents into Azure AI Search index.
 * Run once after configuring Azure credentials: npm run index:seed
 *
 * Requires MOCK_AZURE=false and valid AZURE_* env vars.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function seedPolicies() {
  const azureConfig = require('../src/config/azure');

  if (azureConfig.useMock) {
    console.log('MOCK_AZURE is enabled. Policies are loaded in-memory at startup.');
    console.log('Set MOCK_AZURE=false and configure Azure credentials to seed the real index.');
    process.exit(0);
  }

  const { AzureOpenAI } = require('openai');
  const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

  const openai = new AzureOpenAI({
    endpoint: azureConfig.openai.endpoint,
    apiKey: azureConfig.openai.apiKey,
    apiVersion: azureConfig.openai.apiVersion,
  });

  const searchClient = new SearchClient(
    azureConfig.search.endpoint,
    azureConfig.search.indexName,
    new AzureKeyCredential(azureConfig.search.apiKey)
  );

  const policiesDir = path.join(__dirname, '..', 'data', 'policies');
  const files = fs.readdirSync(policiesDir).filter((f) => f.endsWith('.md'));

  const documents = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(policiesDir, file), 'utf-8');
    const title = file.replace('.md', '').replace(/-/g, ' ');
    const chunks = content.split('\n\n').filter((p) => p.trim());

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResponse = await openai.embeddings.create({
        model: azureConfig.openai.embeddingDeployment,
        input: chunk,
      });

      documents.push({
        id: `${file}-chunk-${i}`,
        title,
        content: chunk,
        category: title.split(' ')[0],
        contentVector: embeddingResponse.data[0].embedding,
      });
    }
  }

  const result = await searchClient.uploadDocuments(documents);
  console.log(`Seeded ${documents.length} policy chunks into Azure AI Search.`);
  console.log('Results:', result.results.map((r) => `${r.key}: ${r.succeeded ? 'OK' : 'FAIL'}`));
}

seedPolicies().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
