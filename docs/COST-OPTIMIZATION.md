# Cost Optimization Guide

Strategies discussed for reducing Azure OpenAI spend in the AI Customer Support Agent pipeline.

> **Related:** [TECHNICAL-DOCUMENTATION.md](TECHNICAL-DOCUMENTATION.md) — full architecture and pipeline details.

---

## 1. Current Cost Baseline

Each support request in production (`MOCK_AZURE=false`) makes **3 Azure OpenAI API calls**:

| Step | API Type | Method | Purpose |
|------|----------|--------|---------|
| 1 | Chat completion | `OpenAIService.classifyIntent()` | Classify customer intent |
| 2 | Embedding | `OpenAIService.generateEmbedding()` | RAG policy vector search |
| 3 | Chat completion | `OpenAIService.generateResponse()` | Generate customer reply |

Default model: `gpt-4o-mini` (chat), `text-embedding-3-small` (embeddings).

### Key insight

Intent classification does **not** drive compensation. Coupon/refund decisions come from `CompensationService` based on shipment delay days. Intent is used for logging, API response metadata, and response prompt context only.

---

## 2. Cost-Cutting Options Discussed

### Option A — Cache frequent messages (not recommended)

**Idea:** Cache intent, embeddings, RAG results, and responses for repeat or similar queries.

| Layer | Cache key | Saves |
|-------|-----------|-------|
| Semantic message cache | Embedding similarity of `customerMessage` | Intent + embedding calls |
| RAG policy cache | Intent bucket or semantic cluster | Repeated vector search |
| Response cache | `orderId` + shipment state + intent | Response LLM call |

**Challenge:** Response depends on order/shipment state, not just the question. Cache keys must include `daysDelayed`, `status`, coupon/refund flags.

**Paraphrase matching:** Use embedding cosine similarity (threshold ~0.92) to treat different wordings as the same question.

**Decision:** Deprioritized — adds Redis/infrastructure complexity. Pipeline redesign is simpler.

---

### Option B — Merge intent + response into one LLM call (not recommended)

**Idea:** Remove `classifyIntent()`, return `{ intent, message }` from a single response call at the end of the pipeline.

**Problem:** Intent as Step 1 acts as a **gate**. Off-topic queries (`product_inquiry`, `other`) should stop after Call 1 with a canned reply — without hitting OMS, Courier, RAG, or response generation.

With merged intent at the end, the full pipeline runs for every message, including irrelevant ones. Wastes API calls and backend integrations.

**Decision:** Rejected for production.

---

### Option C — Gate-first 2-LLM pipeline (recommended)

**Idea:** Keep intent as Call 1 (early exit gate). Drop the RAG embedding call. Use intent-based policy lookup instead of vector search.

```
Call 1: classifyIntent()                    ← GATE
          ↓
     Allowed intent?
     (order_delivery_inquiry, refund_request)
          ↓ NO  → return early (1 LLM call total) — STOP
          ↓ YES
     OMS + Courier + Compensation          ← no LLM
          ↓
Call 2: generateResponse()                ← only for valid intents
```

| Request type | LLM calls | Backend calls |
|--------------|-----------|---------------|
| Off-topic | **1** (intent only) | None |
| Valid order query | **2** (intent + response) | OMS + Courier |

**Replace RAG embedding with intent → policy map:**

| Intent | Policy file |
|--------|-------------|
| `order_delivery_inquiry` | `delivery-policy.md`, `coupon-policy.md` |
| `refund_request` | `refund-policy.md`, `delivery-policy.md` |

**Trade-off:** Loses semantic vector search for policies. Acceptable for a small, fixed policy set (3 files).

**Implementation changes:**

- `aiOrchestrator.js` — add early exit after `classifyIntent()`; remove `ragService.search()` embedding path
- New `PolicyLookupService` or extend `PromptService` — map intent to policy files
- `RAGService` — optional; keep for future scale, bypass in cost-optimized mode

---

### Option D — Cheaper model for intent only (recommended)

**Idea:** Use a separate, lower-cost deployment for intent classification. Keep the main model for customer-facing response generation.

Intent is a simple task: 5 fixed labels, short input, JSON output (~20 tokens), `temperature: 0`.

| Step | Model | Config |
|------|-------|--------|
| Intent (gate) | Cheaper deployment | `AZURE_OPENAI_INTENT_DEPLOYMENT` |
| Response | Main deployment | `AZURE_OPENAI_DEPLOYMENT` |

**Example env:**

```env
AZURE_OPENAI_INTENT_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

**Code change:** In `classifyIntent()` use `intentDeployment`; in `generateResponse()` use `deployment`.

**Accuracy safeguard:** If `confidence < 0.7`, return a rephrase prompt instead of proceeding.

**Pairs well with Option C:** Off-topic queries cost 1 cheap call. Valid queries use cheap intent + main response.

---

### Option E — Rule/keyword intent classifier (no LLM for intent)

**Idea:** Use the existing mock-mode logic (`_mockClassifyIntent`) in production for intent — keyword matching, no LLM.

```javascript
// Already exists in OpenAIService.js mock path
"hasn't arrived" | "delayed" | "where is my order" → order_delivery_inquiry
"refund" → refund_request
else → general_complaint
```

| Pros | Cons |
|------|------|
| Zero LLM cost for intent | Brittle for unusual phrasing |
| Instant, deterministic | Poor paraphrase handling |

**Decision:** Viable for MVP or very high volume with fixed query patterns. LLM intent (Option D) is better for production quality.

---

### Option F — Remove intent step entirely

**Idea:** Drop `classifyIntent()`, let the response LLM infer intent from the customer message in the prompt.

| Pros | Cons |
|------|------|
| Saves 1 chat call per valid request | No early exit for off-topic queries |
| Simplest code change | Full pipeline runs for junk traffic |

**Decision:** Only suitable if all incoming queries are guaranteed order-related.

---

### Option G — Parallel execution (latency, not cost)

**Idea:** Run RAG search and OMS lookup in parallel — neither depends on the other.

```javascript
const [policyChunks, order] = await Promise.all([
  ragService.search(customerMessage, requestId),
  orderService.getOrderById(orderId, requestId),
]);
```

Does not reduce LLM calls but improves response time.

---

## 3. Recommended Production Setup

Combine **Option C** (gate-first 2-LLM) + **Option D** (cheaper intent model):

```
┌─────────────────────────────────────────────────────────┐
│  Customer Request                                       │
└────────────────────┬────────────────────────────────────┘
                     ▼
         ┌───────────────────────┐
         │ Call 1: Intent (cheap) │  ← AZURE_OPENAI_INTENT_DEPLOYMENT
         └───────────┬───────────┘
                     ▼
              Allowed intent?
              ┌──────┴──────┐
             NO            YES
              │              │
              ▼              ▼
        Early return    OMS + Courier
        (1 cheap call)  + Compensation
        canned message       │
                             ▼
                    Intent → policy map
                    (no embedding)
                             │
                             ▼
                    ┌────────────────────┐
                    │ Call 2: Response   │  ← AZURE_OPENAI_DEPLOYMENT
                    └────────────────────┘
```

### Expected savings

| Scenario | Current (3 calls) | Optimized |
|----------|-------------------|-----------|
| Off-topic query | 3 calls + OMS/Courier | **1 cheap call** |
| Valid order query | 3 calls | **2 calls** (cheap intent + response) |

---

## 4. Early Exit Implementation (orchestrator)

```javascript
const ALLOWED_INTENTS = ['order_delivery_inquiry', 'refund_request'];

const intentResult = await this.openAIService.classifyIntent(
  request.customerMessage,
  requestId
);

if (!ALLOWED_INTENTS.includes(intentResult.intent)) {
  return new SupportResponse({
    customer: request.customerName,
    orderId: request.orderId,
    message: 'I can only assist with order delivery and refund queries. Please contact support for other topics.',
    intent: intentResult.intent,
  });
}

// Proceed: policy lookup → OMS → Courier → compensation → generateResponse
```

---

## 5. Handling Different Question Formats

Same answer for different phrasings is handled at separate layers:

| Layer | Mechanism | Format-independent? |
|-------|-----------|---------------------|
| Intent | LLM semantic classifier (Option D) or keywords (Option E) | Yes — LLM understands meaning |
| Policy context | Intent → policy map (Option C) or embedding RAG (current) | Yes with RAG; good enough with intent map |
| Compensation | Rule engine on `daysDelayed` | Yes — ignores question wording |
| Response | LLM with structured facts | Wording varies; outcome is consistent |

---

## 6. Implementation Checklist

| # | Task | File(s) | Priority |
|---|------|---------|----------|
| 1 | Add `AZURE_OPENAI_INTENT_DEPLOYMENT` env var | `.env.example`, `src/config/azure.js` | High |
| 2 | Use separate deployment in `classifyIntent()` | `src/services/OpenAIService.js` | High |
| 3 | Add early exit for non-allowed intents | `src/agents/aiOrchestrator.js` | High |
| 4 | Replace RAG embedding with intent → policy map | New service or `PromptService` | High |
| 5 | Add confidence threshold guard (`< 0.7`) | `src/agents/aiOrchestrator.js` | Medium |
| 6 | Parallel RAG + OMS (if keeping RAG) | `src/agents/aiOrchestrator.js` | Low |
| 7 | Feature flag: `COST_OPTIMIZED_PIPELINE=true` | `src/config/app.js` | Medium |

---

## 7. Options Summary

| Option | LLM calls (valid) | LLM calls (off-topic) | Early exit | Complexity | Status |
|--------|-------------------|------------------------|------------|------------|--------|
| Current pipeline | 3 | 3 | Partial (intent exists, not enforced) | Low | Active |
| A — Cache | 0–3 (on hit) | 0–1 | Yes | High | Not recommended |
| B — Merge intent + response | 2 | 2 | No | Low | Rejected |
| C — Gate-first 2-LLM | 2 | 1 | Yes | Medium | **Recommended** |
| D — Cheaper intent model | 3 (or 2 with C) | 1 (with C) | Yes (with C) | Low | **Recommended** |
| E — Keyword intent | 2 | 0 | Yes | Low | MVP only |
| F — Remove intent | 2 | 2 | No | Low | Not recommended |
| G — Parallel execution | 3 | 3 | — | Low | Latency only |

**Best combination:** **C + D** — gate-first 2-LLM pipeline with a cheaper intent deployment.
