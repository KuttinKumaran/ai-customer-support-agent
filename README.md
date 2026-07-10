# AI Customer Support Agent

Production-ready Enterprise AI application for **Samsung D2C E-Commerce** customer support. Handles order delivery inquiries using Azure OpenAI, RAG-based policy retrieval, OMS integration, courier tracking, and automated compensation rules.

> **Full technical documentation:** [docs/TECHNICAL-DOCUMENTATION.md](docs/TECHNICAL-DOCUMENTATION.md)  
> **Cost optimization guide:** [docs/COST-OPTIMIZATION.md](docs/COST-OPTIMIZATION.md)

## Architecture

```
Controller → AI Orchestrator → RAG / OMS / Courier / Compensation → Azure OpenAI → REST Response
```

| Layer | Responsibility |
|-------|---------------|
| **Controller** | Validates input, returns standardized JSON |
| **AI Orchestrator** | Coordinates the full pipeline |
| **RAG Service** | Retrieves delivery/refund/coupon policies |
| **Order Service** | Fetches order details from OMS |
| **Shipping Service** | Fetches courier tracking status |
| **Compensation Engine** | Applies 3/7-day business rules |
| **OpenAI Service** | Intent classification + response generation |

## Prerequisites

**Option A — Docker (recommended)**
- Docker Desktop 4.x+ (includes Docker Compose)

**Option B — Local Node.js**
- Node.js 18+
- npm

## Quick Start with Docker (Recommended)

No Node.js install required. Builds and runs the full app in a container.

```bash
# Build and start the container (mocks enabled)
docker compose up --build -d

# Check container health
docker compose ps

# View logs
docker compose logs -f ai-support-agent
```

Server runs at `http://localhost:3000`. Swagger docs at `http://localhost:3000/api-docs`.

**Test the API:**
```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/api/support \
  -H "Content-Type: application/json" \
  -d "{\"customerName\":\"Kumaran\",\"customerMessage\":\"My Samsung TV order has not arrived. Please help me.\",\"orderId\":\"ORD1001\"}"
```

**Stop the container:**
```bash
docker compose down
```

### Docker Commands (npm scripts)

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build Docker image |
| `npm run docker:up` | Build and start in background |
| `npm run docker:down` | Stop and remove containers |
| `npm run docker:logs` | Tail application logs |
| `npm run docker:test` | Run Jest tests inside Docker |
| `npm run docker:prod` | Start production compose (real Azure) |

### Production Deployment with Docker

1. Copy and configure environment:
```bash
cp .env.example .env
# Edit .env — set MOCK_AZURE=false and add Azure credentials
```

2. Seed Azure AI Search index (one-time, run locally or in CI):
```bash
npm run index:seed
```

3. Deploy with production compose:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### Docker Architecture

```
┌─────────────────────────────────────────────┐
│  Docker Container (node:20-alpine)          │
│  ┌───────────────────────────────────────┐  │
│  │  AI Customer Support Agent :3000      │  │
│  │  - Express API                        │  │
│  │  - Mock OMS / Courier / Azure         │  │
│  │  - Policy data (data/policies/)       │  │
│  │  - Health check: GET /health          │  │
│  └───────────────────────────────────────┘  │
│  Volume: app-logs → /app/src/logs           │
└─────────────────────────────────────────────┘
         Port 3000:3000 (host:container)
```

## Quick Start (Local Node.js)

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start the server (all mocks enabled by default)
npm start
```

Server runs at `http://localhost:3000`. Swagger docs at `http://localhost:3000/api-docs`.

## API Usage

### Health Check

```bash
curl http://localhost:3000/health
```

### Submit Support Request

```bash
curl -X POST http://localhost:3000/api/support \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Kumaran",
    "customerMessage": "My Samsung TV order has not arrived. Please help me.",
    "orderId": "ORD1001"
  }'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "customer": "Kumaran",
    "orderId": "ORD1001",
    "status": "Delayed",
    "daysDelayed": 4,
    "coupon": 500,
    "message": "Dear Kumaran, we apologize for the delay with your Samsung order. Based on our policy, you are eligible for a ₹500 coupon on your next purchase. Your order is in transit and should arrive soon. Thank you for choosing Samsung.",
    "intent": "order_delivery_inquiry"
  },
  "meta": {
    "requestId": "uuid-here",
    "timestamp": "2026-07-09T07:53:00.000Z"
  }
}
```

## Compensation Business Rules

| Condition | Action |
|-----------|--------|
| Delay >= 7 days | Full refund eligible |
| Delay >= 3 days | ₹500 coupon eligible |
| Otherwise | Apologize + expected delivery date |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `MOCK_AZURE` | Mock Azure OpenAI + Search | `true` |
| `MOCK_OMS` | Mock order management | `true` |
| `MOCK_COURIER` | Mock courier/shipping | `true` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI URL | — |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | — |
| `AZURE_OPENAI_DEPLOYMENT` | Chat model deployment | `gpt-4o-mini` |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Embedding model | `text-embedding-3-small` |
| `AZURE_SEARCH_ENDPOINT` | Azure AI Search URL | — |
| `AZURE_SEARCH_API_KEY` | Azure AI Search key | — |
| `AZURE_SEARCH_INDEX_NAME` | Search index name | `samsung-policies` |
| `OMS_BASE_URL` | Real OMS API URL | `http://localhost:3001` |
| `COURIER_BASE_URL` | Real Courier API URL | `http://localhost:3002` |
| `RETRY_MAX_ATTEMPTS` | API retry count | `3` |
| `RETRY_DELAY_MS` | Base retry delay (ms) | `1000` |

## Mock Data Management

### OMS Orders

Seed data: `data/mock/orders.json` (uses relative date offsets).

```bash
# List all mock orders
curl http://localhost:3000/api/mock/oms/orders

# Reset to seed data
curl -X POST http://localhost:3000/api/mock/oms/reset

# Add/update an order
curl -X POST http://localhost:3000/api/mock/oms/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD1004","customerName":"Anita","product":"Samsung Watch","orderDateOffsetDays":-3,"status":"SHIPPED","amount":24999,"trackingId":"TRK9004"}'
```

### Courier Shipments

Seed data: `data/mock/shipments.json`.

```bash
# List all mock shipments
curl http://localhost:3000/api/mock/courier/shipments

# Reset to seed data
curl -X POST http://localhost:3000/api/mock/courier/reset
```

## Azure Setup (Production)

1. Create Azure OpenAI resource with chat + embedding deployments.
2. Create Azure AI Search service and index with vector field (`contentVector`, 1536 dimensions).
3. Set `MOCK_AZURE=false` and configure all `AZURE_*` env vars.
4. Seed policies into the search index:

```bash
npm run index:seed
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with file watching |
| `npm test` | Run Jest test suite |
| `npm run index:seed` | Seed policies into Azure AI Search |
| `npm run docker:up` | Build and start via Docker Compose |
| `npm run docker:down` | Stop Docker containers |
| `npm run docker:test` | Run tests inside Docker |
| `npm run docker:prod` | Production Docker deployment |

## Project Structure

```
src/
├── agents/            AI orchestrator
├── config/            App, Azure, retry, DI container, Swagger
├── controllers/       Route controllers
├── middleware/        Validation, logging, error handling
├── models/            Request/response data models
├── prompts/           Reusable prompt templates
├── routes/            API + mock admin routes
├── services/          OpenAI, RAG, OMS, Courier, Compensation, Prompt, Logging
└── utils/             API responses, retry, date helpers
data/
├── policies/          Samsung delivery/refund/coupon policies (RAG source)
└── mock/              OMS + Courier seed data (JSON)
mock-servers/          In-memory OMS/Courier stores
scripts/               Azure index seeding
tests/                 Jest unit + integration tests
Dockerfile             Production multi-stage image
Dockerfile.test        Test image with devDependencies
docker-compose.yml     Local/demo deployment
docker-compose.prod.yml Production deployment
docker-compose.test.yml Run tests in container
```

## Test Demo Orders

| Order ID | Scenario | Expected Result |
|----------|----------|-----------------|
| `ORD1001` | 4-day delay | ₹500 coupon |
| `ORD1002` | Delivered | No compensation |
| `ORD1003` | 8-day delay | Full refund |

## License

MIT
