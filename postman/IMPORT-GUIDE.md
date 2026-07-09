# Postman Import Guide

## Files to Import

| # | File |
|---|------|
| 1 | `AI-Customer-Support-Agent.postman_collection.json` |
| 2 | `AI-Support-Agent-Local.postman_environment.json` |

**Path:** `D:\cursor\ai-customer-support-agent\postman\`

## Import Steps

1. Open Postman → click **Import**
2. **Upload Files** → select both JSON files above
3. Click **Import**
4. Select environment **AI Support Agent — Local Docker** (top-right)
5. Start Docker: `docker compose up -d`
6. Run **Health Check**, then **Submit Support Request — ORD1001**
