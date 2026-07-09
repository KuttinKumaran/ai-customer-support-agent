# AI Customer Support Agent — Technical Documentation

**Project:** AI Customer Support Agent  
**Domain:** Samsung D2C E-Commerce Platform  
**Version:** 1.0.0  
**Repository:** https://github.com/KuttinKumaran/ai-customer-support-agent  
**Local Path:** `D:\cursor\ai-customer-support-agent`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Scenario](#2-business-scenario)
3. [Target Architecture](#3-target-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Implementation Flow](#6-implementation-flow)
7. [AI Orchestration Pipeline](#7-ai-orchestration-pipeline)
8. [Azure OpenAI & Azure AI Search Configuration](#8-azure-openai--azure-ai-search-configuration)
9. [OMS & Courier Mock Data Design](#9-oms--courier-mock-data-design)
10. [Compensation Business Rules](#10-compensation-business-rules)
11. [REST API Reference](#11-rest-api-reference)
12. [Dependency Injection](#12-dependency-injection)
13. [Docker Containerization](#13-docker-containerization)
14. [Postman Collection](#14-postman-collection)
15. [Testing Strategy](#15-testing-strategy)
16. [Environment Variables](#16-environment-variables)
17. [Deployment Guide](#17-deployment-guide)
18. [GitHub Repository](#18-github-repository)
19. [Appendix — End-to-End Walkthrough](#19-appendix--end-to-end-walkthrough)

---

## 1. Executive Summary

The **AI Customer Support Agent** is a production-ready Enterprise Node.js application that automates Samsung D2C customer support for order delivery inquiries. When a customer reports a delayed order, the system:

1. Classifies intent using **Azure OpenAI**
2. Retrieves company policies using **RAG** (Azure AI Search)
3. Fetches order details from an **OMS API**
4. Fetches shipment status from a **Courier API**
5. Applies **compensation business rules**
6. Generates a customer-friendly response using **Azure OpenAI**
7. Logs the full execution flow and returns a standardized **REST API** response

The application uses **clean architecture** with dependency injection, supports **mock/fallback mode** for local development without Azure credentials, and is fully **Dockerized** for consistent deployment.

---

## 2. Business Scenario

**Customer message:**
> "My Samsung TV order hasn't arrived. Please help me."

**System actions:**

| Step | Action |
|------|--------|
| 1 | Understand customer intent (delivery inquiry) |
| 2 | Retrieve delivery/refund/coupon policies via RAG |
| 3 | Fetch order `ORD1001` from OMS |
| 4 | Fetch shipment tracking from Courier |
| 5 | Calculate delay and apply compensation rules |
| 6 | Generate empathetic, policy-compliant response |
| 7 | Return structured JSON to the caller |

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
    "message": "We apologize for the delay. Based on our policy you are eligible for a ₹500 coupon. Your order will arrive soon.",
    "intent": "order_delivery_inquiry"
  },
  "meta": {
    "requestId": "a8cd16db-4e52-423d-9f32-ab1e26502d8b",
    "timestamp": "2026-07-09T08:11:54.794Z"
  }
}
```

---

## 3. Target Architecture

### 3.1 High-Level Architecture Diagram

```
                    ┌─────────────────────┐
                    │   POST /api/support  │  ← Customer request
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  SupportController   │  ← Validates input
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   AI Orchestrator    │  ← Coordinates pipeline
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           │                   │                   │
    ┌──────▼──────┐    ┌───────▼───────┐   ┌──────▼──────┐
    │  OpenAI     │    │  RAG Service  │   │ Order Svc   │
    │  (Intent)   │    │  + Search DB  │   │  → OMS      │
    └─────────────┘    └───────────────┘   └──────┬──────┘
                                                    │
    ┌─────────────┐    ┌───────────────┐   ┌──────▼──────┐
    │  OpenAI     │    │ Compensation  │   │ Shipping    │
    │  (Reply)    │    │   Engine      │   │  → Courier  │
    └─────────────┘    └───────────────┘   └─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   LoggingService    │  ← Full trace by requestId
                    └─────────────────────┘
```

### 3.2 Layer Responsibilities

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **API** | `SupportController` | HTTP handling, input validation, standardized responses |
| **Orchestration** | `AIOrchestrator` | Runs the 6-step pipeline, passes context between services |
| **AI** | `OpenAIService` | Intent classification + customer response generation |
| **Knowledge** | `RAGService` | Policy retrieval via vector search |
| **Integration** | `OrderService` | OMS order lookup |
| **Integration** | `ShippingService` | Courier shipment lookup |
| **Business Rules** | `CompensationService` | Coupon/refund eligibility (no AI) |
| **Prompts** | `PromptService` | Reusable prompt template assembly |
| **Observability** | `LoggingService` | Request-scoped Winston logging |

### 3.3 Clean Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| Separation of concerns | One service per external system or capability |
| Dependency injection | `src/config/container.js` wires all services at startup |
| Testability | Mock toggles (`MOCK_AZURE`, `MOCK_OMS`, `MOCK_COURIER`) |
| Resilience | Shared retry utility with exponential backoff |
| Config-driven | All behavior controlled via `.env` |
| Standardized API | `{ success, data, meta }` / `{ success, error, meta }` |

---

## 4. Technology Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| AI | Azure OpenAI (`openai` SDK + `@azure/openai`) |
| Vector DB | Azure AI Search (`@azure/search-documents`) |
| HTTP Client | axios (with retry) |
| Logging | winston |
| Config | dotenv |
| API Docs | swagger-jsdoc + swagger-ui-express |
| Testing | Jest + supertest |
| Containerization | Docker + Docker Compose |
| ID Generation | uuid |

---

## 5. Project Structure

```
ai-customer-support-agent/
├── src/
│   ├── agents/
│   │   └── aiOrchestrator.js       # Pipeline coordinator
│   ├── config/
│   │   ├── app.js                  # App-level config
│   │   ├── azure.js                # Azure + mock toggle logic
│   │   ├── container.js            # Dependency injection
│   │   ├── logger.js               # Winston setup
│   │   ├── retry.js                # Retry config
│   │   └── swagger.js              # OpenAPI spec
│   ├── controllers/
│   │   └── supportController.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── requestLogger.js
│   │   └── validateRequest.js
│   ├── models/
│   │   ├── order.js
│   │   ├── shipment.js
│   │   ├── supportRequest.js
│   │   └── supportResponse.js
│   ├── prompts/
│   │   ├── intentPrompt.js
│   │   ├── responsePrompt.js
│   │   └── systemPrompt.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── mockRoutes.js           # OMS/Courier admin (dev only)
│   │   └── supportRoutes.js
│   ├── services/
│   │   ├── CompensationService.js
│   │   ├── LoggingService.js
│   │   ├── OpenAIService.js
│   │   ├── OrderService.js
│   │   ├── PromptService.js
│   │   ├── RAGService.js
│   │   └── ShippingService.js
│   ├── utils/
│   │   ├── apiResponse.js
│   │   ├── dateUtils.js
│   │   └── retry.js
│   ├── logs/                       # Winston log output
│   ├── app.js
│   └── server.js
├── data/
│   ├── policies/                   # RAG source documents
│   │   ├── delivery-policy.md
│   │   ├── refund-policy.md
│   │   └── coupon-policy.md
│   └── mock/
│       ├── orders.json             # OMS seed data
│       └── shipments.json          # Courier seed data
├── mock-servers/
│   ├── omsStore.js                 # In-memory OMS store
│   └── courierStore.js             # In-memory Courier store
├── postman/
│   ├── AI-Customer-Support-Agent.postman_collection.json
│   ├── AI-Support-Agent-Local.postman_environment.json
│   └── IMPORT-GUIDE.md
├── scripts/
│   ├── seed-policies.js            # Azure AI Search indexer
│   └── push-to-github.ps1
├── tests/
│   ├── compensationService.test.js
│   ├── orchestrator.test.js
│   ├── ragService.test.js
│   └── supportController.test.js
├── docs/
│   └── TECHNICAL-DOCUMENTATION.md  # This document
├── Dockerfile
├── Dockerfile.test
├── docker-compose.yml
├── docker-compose.prod.yml
├── docker-compose.test.yml
├── .env.example
├── package.json
└── README.md
```

---

## 6. Implementation Flow

The project was built in 11 incremental steps:

| Step | Deliverable |
|------|-------------|
| 1 | Express server bootstrap, health check, Winston logging |
| 2 | Folder structure, config files, middleware, API responses |
| 3 | `POST /api/support` route, controller, validation |
| 4 | RAGService, policy documents, mock Azure AI Search |
| 5 | OpenAIService, PromptService, intent + response generation |
| 6 | Mock OMS + OrderService with retry logic |
| 7 | Mock Courier + ShippingService with retry logic |
| 8 | CompensationService with 3/7-day rules + unit tests |
| 9 | Prompt builder (RAG + OMS + Courier + compensation context) |
| 10 | AIOrchestrator full pipeline + LoggingService trace |
| 11 | Swagger docs, Jest tests, README, Docker, Postman |

---

## 7. AI Orchestration Pipeline

### 7.1 Pipeline Steps

```
Customer Request
      │
      ▼
[1] Intent Classification     → OpenAIService.classifyIntent()
      │
      ▼
[2] RAG Policy Search         → RAGService.search()
      │
      ▼
[3] OMS Order Lookup          → OrderService.getOrderById()
      │
      ▼
[4] Courier Shipment Lookup   → ShippingService.getShipmentByTrackingId()
      │
      ▼
[5] Compensation Evaluation   → CompensationService.evaluate()
      │
      ▼
[6] Response Generation       → PromptService + OpenAIService.generateResponse()
      │
      ▼
Standardized JSON Response
```

### 7.2 Logging Trace (per requestId)

Every step is logged via `LoggingService`:

```
[requestId=abc-123] Pipeline started
[requestId=abc-123] Classifying intent
[requestId=abc-123] Intent classified → order_delivery_inquiry
[requestId=abc-123] RAG policy search
[requestId=abc-123] Fetching order from OMS → ORD1001
[requestId=abc-123] Fetching shipment from Courier → TRK9001
[requestId=abc-123] Compensation evaluated → coupon ₹500, daysDelayed=4
[requestId=abc-123] Generating response
[requestId=abc-123] Pipeline completed
```

Log files: `src/logs/combined.log`, `src/logs/error.log`

---

## 8. Azure OpenAI & Azure AI Search Configuration

### 8.1 Two-Phase Model

RAG requires **setup** (one-time) and **runtime** (per request) phases:

#### Phase A — Setup (run once)

```
data/policies/*.md  →  chunk  →  embed (Azure OpenAI)  →  upload (Azure AI Search)
```

```bash
# Configure .env with Azure credentials
MOCK_AZURE=false

# Seed the vector index
npm run index:seed
```

The seed script (`scripts/seed-policies.js`):
1. Reads markdown from `data/policies/`
2. Splits into paragraph chunks
3. Generates embeddings via Azure OpenAI
4. Upserts documents into Azure AI Search with stable IDs

#### Phase B — Runtime (every request)

```
Customer message  →  embed query  →  vector search  →  top-K policy chunks  →  GPT prompt
```

### 8.2 Azure Resources Required

| Resource | Purpose | Env Variable |
|----------|---------|--------------|
| Azure OpenAI — Chat deployment | Intent + response generation | `AZURE_OPENAI_DEPLOYMENT` |
| Azure OpenAI — Embedding deployment | Query + document embeddings | `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` |
| Azure AI Search — Index | Vector storage + retrieval | `AZURE_SEARCH_INDEX_NAME` |

### 8.3 Recommended Index Schema

```json
{
  "name": "samsung-policies",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true },
    { "name": "title", "type": "Edm.String", "searchable": true },
    { "name": "content", "type": "Edm.String", "searchable": true },
    { "name": "category", "type": "Edm.String", "filterable": true },
    {
      "name": "contentVector",
      "type": "Collection(Edm.Single)",
      "dimensions": 1536,
      "vectorSearchProfile": "default-profile"
    }
  ]
}
```

> `dimensions` must match the embedding model: **1536** for `text-embedding-3-small`.

### 8.4 Mock Mode (`MOCK_AZURE=true`)

When Azure credentials are unavailable:

| Real Mode | Mock Mode |
|-----------|-----------|
| Azure OpenAI embeddings | Hash-based mock vectors |
| Azure AI Search | In-memory keyword search over `data/policies/` |
| GPT chat completions | Deterministic template responses |

Mock decision logic (`src/config/azure.js`):

```
MOCK_AZURE=true          → always mock
Missing credentials      → mock in development, fail in production
All credentials present  → real Azure
```

### 8.5 Policy Documents

| File | Content |
|------|---------|
| `data/policies/delivery-policy.md` | Delivery timelines, delay compensation rules |
| `data/policies/refund-policy.md` | Full/partial refund eligibility |
| `data/policies/coupon-policy.md` | ₹500 coupon terms and redemption |

---

## 9. OMS & Courier Mock Data Design

### 9.1 Architecture

```
data/mock/orders.json      ──load──►  omsStore (in-memory)  ◄── OrderService
data/mock/shipments.json   ──load──►  courierStore (memory) ◄── ShippingService
```

Controllers and the orchestrator **never** read JSON files directly — all access goes through service classes.

### 9.2 Relative Date Offsets

Seed data uses **offset fields** so demo scenarios stay valid over time:

```json
{
  "orderId": "ORD1001",
  "orderDateOffsetDays": -10,
  "expectedDeliveryOffsetDays": -4
}
```

At load time, `dateUtils.resolveDateOffsets()` converts offsets to ISO dates relative to today.

### 9.3 Seed Data — Orders

| Order ID | Customer | Product | Status | Scenario |
|----------|----------|---------|--------|----------|
| ORD1001 | Kumaran | Samsung 55" QLED TV | SHIPPED | 4-day delay → coupon |
| ORD1002 | Priya | Galaxy S25 Ultra | DELIVERED | No compensation |
| ORD1003 | Rahul | 300L Refrigerator | SHIPPED | 8-day delay → refund |

### 9.4 Refill / Reset Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/mock/oms/orders` | List all orders |
| `GET` | `/api/mock/oms/orders/:orderId` | Get single order |
| `POST` | `/api/mock/oms/reset` | Reload from `orders.json` |
| `POST` | `/api/mock/oms/orders` | Add or update an order |
| `GET` | `/api/mock/courier/shipments` | List all shipments |
| `GET` | `/api/mock/courier/shipments/:trackingId` | Get single shipment |
| `POST` | `/api/mock/courier/reset` | Reload from `shipments.json` |
| `POST` | `/api/mock/courier/shipments` | Add or update a shipment |

> Mock admin routes are disabled when `NODE_ENV=production`.

### 9.5 Fetch Pattern (OrderService)

```javascript
if (MOCK_OMS === true) {
  return omsStore.getByOrderId(orderId);   // in-process
} else {
  return axios.get(`${OMS_BASE_URL}/orders/${orderId}`);  // real API + retry
}
```

---

## 10. Compensation Business Rules

Implemented in `CompensationService` — **pure business logic, no AI**.

| Condition | Action |
|-----------|--------|
| `daysDelayed >= 7` | Full refund eligible |
| `daysDelayed >= 3` | ₹500 coupon eligible |
| Shipment `DELIVERED` | No compensation |
| Otherwise | Apologize + share expected delivery date |

**Delay calculation:**

```
daysDelayed = max(0, today - expectedDeliveryDate)
```

| Order | Expected Delivery | daysDelayed | Result |
|-------|-------------------|-------------|--------|
| ORD1001 | 4 days ago | 4 | ₹500 coupon |
| ORD1002 | Delivered | 0 | No compensation |
| ORD1003 | 8 days ago | 8 | Full refund |

---

## 11. REST API Reference

**Base URL:** `http://localhost:3000`  
**Swagger UI:** `http://localhost:3000/api-docs`

### 11.1 Health Check

```
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 30.86,
    "timestamp": "2026-07-09T08:10:50.923Z",
    "mockAzure": true,
    "mockOms": true,
    "mockCourier": true,
    "ragIndexSize": 6
  }
}
```

### 11.2 Submit Support Request

```
POST /api/support
Content-Type: application/json
```

**Request body:**

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `customerName` | string | Yes | `"Kumaran"` |
| `customerMessage` | string | Yes | `"My Samsung TV order hasn't arrived."` |
| `orderId` | string | Yes | `"ORD1001"` |

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "customer": "Kumaran",
    "orderId": "ORD1001",
    "status": "Delayed",
    "daysDelayed": 4,
    "coupon": 500,
    "refund": false,
    "message": "Dear Kumaran, we apologize for the delay...",
    "intent": "order_delivery_inquiry"
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

### 11.3 Error Responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "customerMessage is required..."
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

| HTTP Status | Error Code | Cause |
|-------------|------------|-------|
| 400 | `VALIDATION_ERROR` | Missing or invalid request fields |
| 404 | `ORDER_NOT_FOUND` | Order ID not in OMS |
| 404 | `SHIPMENT_NOT_FOUND` | Tracking ID not in Courier |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 12. Dependency Injection

All services are wired in `src/config/container.js`:

```javascript
const loggingService   = new LoggingService();
const promptService    = new PromptService();
const openAIService    = new OpenAIService(azureConfig, loggingService);
const ragService       = new RAGService(azureConfig, openAIService, loggingService);
const orderService     = new OrderService(appConfig, retryConfig, loggingService);
const shippingService  = new ShippingService(appConfig, retryConfig, loggingService);
const compensationService = new CompensationService(loggingService);

const orchestrator = new AIOrchestrator({
  openAIService, ragService, orderService, shippingService,
  compensationService, promptService, loggingService,
});

const supportController = new SupportController(orchestrator);
```

Controllers receive the orchestrator via constructor injection — they do not instantiate services directly.

---

## 13. Docker Containerization

### 13.1 Docker Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage production image (`node:20-alpine`, non-root user) |
| `Dockerfile.test` | Test image with devDependencies |
| `docker-compose.yml` | Local/demo (mocks enabled) |
| `docker-compose.prod.yml` | Production (real Azure via `.env`) |
| `docker-compose.test.yml` | Run Jest inside container |

### 13.2 Quick Start

```bash
# Build and start (demo mode)
docker compose up --build -d

# Check health
docker compose ps
curl http://localhost:3000/health

# View logs
docker compose logs -f ai-support-agent

# Stop
docker compose down
```

### 13.3 Container Architecture

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

### 13.4 npm Docker Scripts

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build Docker image |
| `npm run docker:up` | Build and start in background |
| `npm run docker:down` | Stop containers |
| `npm run docker:logs` | Tail application logs |
| `npm run docker:test` | Run Jest tests in Docker |
| `npm run docker:prod` | Production deployment |

### 13.5 Production Docker Deployment

```bash
cp .env.example .env
# Set MOCK_AZURE=false and add Azure credentials

npm run index:seed          # One-time policy indexing
npm run docker:prod         # Start production container
```

---

## 14. Postman Collection

### 14.1 Import Files

| File | Path |
|------|------|
| Collection | `postman/AI-Customer-Support-Agent.postman_collection.json` |
| Environment | `postman/AI-Support-Agent-Local.postman_environment.json` |

**Import steps:**
1. Postman → **Import** → Upload both JSON files
2. Select environment: **AI Support Agent — Local Docker**
3. Ensure Docker is running: `docker compose up -d`

### 14.2 Environment Variable

| Variable | Value |
|----------|-------|
| `baseUrl` | `http://localhost:3000` |

### 14.3 Pre-built Requests

```
AI Customer Support Agent
├── Health Check                         GET  /health
├── Submit Support Request — ORD1001       POST /api/support  (₹500 coupon)
├── Submit Support Request — ORD1002       POST /api/support  (Delivered)
├── Submit Support Request — ORD1003       POST /api/support  (Refund)
├── Submit Support Request — Validation  POST /api/support  (400 error)
├── Submit Support Request — Not Found   POST /api/support  (404 error)
├── List All Orders                      GET  /api/mock/oms/orders
├── Get Order by ID                      GET  /api/mock/oms/orders/ORD1001
├── Reset OMS Data                       POST /api/mock/oms/reset
├── Add/Update Order                     POST /api/mock/oms/orders
├── List All Shipments                   GET  /api/mock/courier/shipments
├── Get Shipment by Tracking ID          GET  /api/mock/courier/shipments/TRK9001
├── Reset Courier Data                   POST /api/mock/courier/reset
└── Add/Update Shipment                  POST /api/mock/courier/shipments
```

---

## 15. Testing Strategy

### 15.1 Test Suites

| Test File | Coverage |
|-----------|----------|
| `compensationService.test.js` | All compensation rule branches (0, 3, 4, 7+ days) |
| `ragService.test.js` | Mock index loading, policy retrieval |
| `orchestrator.test.js` | Full ORD1001 end-to-end pipeline |
| `supportController.test.js` | HTTP layer (health, support, validation, 404) |

### 15.2 Run Tests

```bash
# Local
npm test

# Inside Docker
npm run docker:test
```

**Verified result:** 17/17 tests passing.

### 15.3 Demo Test Matrix

| Order ID | Delay | Expected `coupon` | Expected `refund` | Expected `status` |
|----------|-------|-------------------|-------------------|-------------------|
| ORD1001 | 4 days | 500 | false | Delayed |
| ORD1002 | — | null | false | Delivered |
| ORD1003 | 8 days | null | true | Delayed |

---

## 16. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `MOCK_AZURE` | Mock Azure OpenAI + Search | `true` |
| `MOCK_OMS` | Mock order management | `true` |
| `MOCK_COURIER` | Mock courier/shipping | `true` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI URL | — |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | — |
| `AZURE_OPENAI_DEPLOYMENT` | Chat model deployment | `gpt-4o-mini` |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Embedding model | `text-embedding-3-small` |
| `AZURE_OPENAI_API_VERSION` | API version | `2024-10-21` |
| `AZURE_SEARCH_ENDPOINT` | Azure AI Search URL | — |
| `AZURE_SEARCH_API_KEY` | Azure AI Search key | — |
| `AZURE_SEARCH_INDEX_NAME` | Search index name | `samsung-policies` |
| `OMS_BASE_URL` | Real OMS API URL | `http://localhost:3001` |
| `COURIER_BASE_URL` | Real Courier API URL | `http://localhost:3002` |
| `RETRY_MAX_ATTEMPTS` | API retry count | `3` |
| `RETRY_DELAY_MS` | Base retry delay (ms) | `1000` |

Copy `.env.example` to `.env` before running locally or in production.

---

## 17. Deployment Guide

### 17.1 Development (Docker — recommended)

```bash
git clone https://github.com/KuttinKumaran/ai-customer-support-agent.git
cd ai-customer-support-agent
docker compose up --build -d
```

### 17.2 Production

```bash
# 1. Configure environment
cp .env.example .env
# Set MOCK_AZURE=false, add all AZURE_* credentials

# 2. Seed Azure AI Search (one-time)
npm run index:seed

# 3. Deploy
docker compose -f docker-compose.prod.yml up --build -d

# 4. Verify
curl http://localhost:3000/health
```

### 17.3 Mock vs Real Mode Matrix

| Component | Development | Production |
|-----------|-------------|------------|
| Azure OpenAI | `MOCK_AZURE=true` | Real Azure required |
| Azure AI Search | In-memory mock | Real + seeded index |
| OMS | `MOCK_OMS=true` + JSON | Real OMS API |
| Courier | `MOCK_COURIER=true` + JSON | Real Courier API |

---

## 18. GitHub Repository

| Item | Value |
|------|-------|
| **URL** | https://github.com/KuttinKumaran/ai-customer-support-agent |
| **Branch** | `main` |
| **Visibility** | Public |
| **Clone** | `git clone https://github.com/KuttinKumaran/ai-customer-support-agent.git` |

**Push script (for future updates):**
```powershell
.\scripts\push-to-github.ps1
```

---

## 19. Appendix — End-to-End Walkthrough

**Input:**
```json
{
  "customerName": "Kumaran",
  "customerMessage": "My Samsung TV order hasn't arrived. Please help me.",
  "orderId": "ORD1001"
}
```

**Pipeline execution:**

| Step | Service | Output |
|------|---------|--------|
| 1 | OpenAIService | `intent: order_delivery_inquiry, confidence: 0.95` |
| 2 | RAGService | 3 policy chunks (delivery delay, coupon, refund rules) |
| 3 | OrderService | ORD1001 — Samsung 55" QLED TV, SHIPPED, placed 10 days ago |
| 4 | ShippingService | TRK9001 — IN_TRANSIT, expected delivery 4 days ago |
| 5 | CompensationService | `daysDelayed: 4` → ₹500 coupon eligible |
| 6 | OpenAIService | Empathetic message citing policy + delivery ETA |

**Final response:**
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
    "requestId": "a8cd16db-4e52-423d-9f32-ab1e26502d8b",
    "timestamp": "2026-07-09T08:11:54.794Z"
  }
}
```

---

*Document generated from project design, implementation, and deployment sessions.*  
*Last updated: July 9, 2026*
