const fs = require('fs');
const path = require('path');

/**
 * RAGService — retrieves relevant policy documents using vector search.
 * Uses Azure AI Search in production; in-memory keyword search in mock mode.
 */
class RAGService {
  constructor(azureConfig, openAIService, loggingService) {
    this.config = azureConfig;
    this.openAIService = openAIService;
    this.loggingService = loggingService;
    this.searchClient = null;
    this.mockIndex = [];

    if (this.config.useMock) {
      this._loadMockIndex();
    } else {
      this._initSearchClient();
    }
  }

  _initSearchClient() {
    const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

    this.searchClient = new SearchClient(
      this.config.search.endpoint,
      this.config.search.indexName,
      new AzureKeyCredential(this.config.search.apiKey)
    );
  }

  /**
   * Load policy markdown files into an in-memory mock index.
   */
  _loadMockIndex() {
    const policiesDir = path.join(__dirname, '..', '..', 'data', 'policies');
    const files = fs.readdirSync(policiesDir).filter((f) => f.endsWith('.md'));

    this.mockIndex = files.map((file) => {
      const content = fs.readFileSync(path.join(policiesDir, file), 'utf-8');
      const title = file.replace('.md', '').replace(/-/g, ' ');

      const chunks = this._chunkText(content, 500);

      return chunks.map((chunk, i) => ({
        id: `${file}-chunk-${i}`,
        title,
        content: chunk,
        category: title.split(' ')[0],
      }));
    }).flat();
  }

  _chunkText(text, maxLength) {
    const paragraphs = text.split('\n\n').filter((p) => p.trim());
    const chunks = [];
    let current = '';

    for (const para of paragraphs) {
      if ((current + para).length > maxLength && current) {
        chunks.push(current.trim());
        current = para;
      } else {
        current = current ? `${current}\n\n${para}` : para;
      }
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Search policy documents relevant to the customer query.
   */
  async search(query, requestId, topK = 3) {
    this.loggingService.logStep(requestId, 'RAG policy search', {
      query: query.substring(0, 100),
      mock: this.config.useMock,
    });

    if (this.config.useMock) {
      return this._mockSearch(query, topK);
    }

    const embedding = await this.openAIService.generateEmbedding(query, requestId);

    const results = await this.searchClient.search('*', {
      vectorSearchOptions: {
        queries: [
          {
            kind: 'vector',
            vector: embedding,
            fields: ['contentVector'],
            kNearestNeighborsCount: topK,
          },
        ],
      },
      select: ['id', 'title', 'content', 'category'],
      top: topK,
    });

    const chunks = [];
    for await (const result of results.results) {
      chunks.push(result.document);
    }

    this.loggingService.logStep(requestId, 'RAG results', {
      chunksFound: chunks.length,
    });

    return chunks;
  }

  /**
   * Mock search using keyword overlap scoring.
   */
  _mockSearch(query, topK) {
    const queryWords = query.toLowerCase().split(/\W+/).filter(Boolean);

    const scored = this.mockIndex.map((doc) => {
      const docWords = `${doc.title} ${doc.content}`.toLowerCase().split(/\W+/);
      const score = queryWords.reduce((acc, word) => {
        return acc + docWords.filter((w) => w.includes(word) || word.includes(w)).length;
      }, 0);
      return { ...doc, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ id, title, content, category }) => ({ id, title, content, category }));
  }

  getIndexSize() {
    return this.config.useMock ? this.mockIndex.length : null;
  }
}

module.exports = RAGService;
