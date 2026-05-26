# EduCred — Production Roadmap

> **North Star:** EduCred is not a certificate website. It is the trust layer for human credentials — the infrastructure employers, universities, governments, and AI hiring agents query before making decisions about people. Every architectural choice either advances or delays that mission.

---

## Where We Are Right Now

**Overall Production Score: 6.5 / 10**

### What Has Been Built

| Area | Status | Evidence |
|------|--------|----------|
| BullMQ async queue | **Done** | `server/queues/producers.js` — real Queue, exponential backoff, dead-letter |
| Redis config | **Done** | `server/config/redis.js` — graceful null degradation when `REDIS_URL` absent |
| OTP isolation | **Done** | `server/models/OtpRecord.js` — separate table, not User model |
| DigiLocker OAuth service | **Done** | `server/utils/digilockerService.js` — full auth URL + token exchange |
| DigiLocker routes + callback page | **Done** | `server/routes/studentRoutes.js`, `client/src/pages/DigilockerCallback.jsx` |
| Anchoring service layer | **Done** | `server/services/anchoringService.js`, `server/services/anchoringQueueService.js` |
| Prometheus metrics endpoint | **Done** | `server/routes/metrics.js` — default + custom HTTP counters/histograms |
| Winston structured logging | **Done** | `server/utils/winstonLogger.js` |
| CI/CD GitHub Actions pipeline | **Done** | `.github/workflows/ci.yml` — test, staging, production gates |
| Verifier dashboard page | **Done** | `client/src/pages/Verifier.jsx` |
| Health check endpoint | **Done** | `server/routes/health.js`, `render.yaml` healthCheckPath |
| Multi-role auth (5 roles) | **Done** | student, university, admin, super_admin, verifier |
| AES-256-GCM key encryption | **Done** | `server/utils/keyVault.js` |
| Fraud detection schema | **Done** | `server/models/FraudAlert.js` |
| Audit log | **Done** | `server/models/AuditLog.js` |
| IPFS / Pinata storage | **Done** | `server/utils/ipfsService.js` |
| PDF + QR generation | **Done** | `server/utils/pdfService.js` |
| Blockchain anchoring (Sepolia) | **Done** | `server/utils/blockchain.js`, `EduCred.sol` |

### What Is Still Missing

| Area | Gap | Severity |
|------|-----|----------|
| Polygon Mainnet | Still on Sepolia testnet — zero real-world trust | **CRITICAL** |
| DigiLocker env vars | Service exists but `DIGILOCKER_CLIENT_ID` + `DIGILOCKER_REDIRECT_URI` not set in production | **HIGH** |
| Redis in production | `REDIS_URL` not configured on Render — BullMQ silently degrades to null | **HIGH** |
| ESLint in CI | `ci.yml` skips linting with a comment | **MEDIUM** |
| Razorpay / Stripe billing | No monetization infrastructure at all | **HIGH** |
| DPDPA compliance | No consent flow, no erasure endpoint, no data localization | **HIGH** |
| Sentry APM | No error tracking in production | **MEDIUM** |
| Grafana / alert routing | Prometheus metrics exist but no dashboard or alerting | **MEDIUM** |
| W3C Verifiable Credentials | Schema stub only — no VC issuance | **MEDIUM** |
| Mobile / PWA | No service worker, no manifest, no React Native | **LOW now, HIGH for India** |
| PgBouncer / connection pooling | Sequelize direct connections, no pool config | **MEDIUM** |
| Bulk verifier CSV upload | Verifier page exists but no batch verification flow | **MEDIUM** |
| University API keys + webhooks | No B2B programmatic access | **MEDIUM** |

---

## Immediate Next Steps (This Week)

These three unblock everything else and can be done in order:

### Step 1 — Connect Redis to Production (2 hours)

BullMQ is built and correct but `REDIS_URL` is not set on Render. Without Redis every certificate anchoring falls back to synchronous blockchain writes inside the HTTP cycle — 15–60 second hangs, fragile, unscalable.

**Actions:**
1. Create a free Upstash Redis instance at upstash.com (no credit card for free tier)
2. Copy the `redis://` connection URL
3. In Render dashboard → educred-backend → Environment → add `REDIS_URL`
4. Redeploy — BullMQ activates automatically, `getRedisConnection()` returns a live client

**Verification:** Hit `POST /api/certificates/issue` and check it returns `202 Accepted` in under 1 second instead of waiting for chain confirmation.

---

### Step 2 — Wire DigiLocker Credentials (1 day)

`digilockerService.js` is complete. Routes exist. The callback page exists. Only the env vars are missing. This unlocks KYC for every Indian student on the platform.

**Actions:**
1. Register EduCred on the NIC DigiLocker sandbox: https://sandbox.digilocker.gov.in
2. Get `client_id` and `client_secret` from NIC dashboard
3. Set callback URL to `https://educred.in/digilocker/callback`
4. Add to Render environment: `DIGILOCKER_CLIENT_ID`, `DIGILOCKER_CLIENT_SECRET`, `DIGILOCKER_REDIRECT_URI`
5. Test the sandbox OAuth flow end-to-end
6. Apply for production access (NIC review takes 1–2 weeks)

---

### Step 3 — Polygon Mainnet Deployment (1 day)

Certificates anchored on Sepolia have no real-world trust. Polygon Mainnet costs ~$0.001 per anchor and is EVM-compatible — zero contract changes needed.

**Actions:**
1. Get a Polygon RPC endpoint: Alchemy (free) or Infura
2. Fund a wallet with ~5 MATIC (~$3 worth covers 3,000 certificates)
3. In `blockchain/hardhat.config.js` add:
   ```js
   polygon: {
     url: process.env.POLYGON_RPC_URL,
     accounts: [process.env.DEPLOYER_PRIVATE_KEY],
     chainId: 137,
   }
   ```
4. `npx hardhat run scripts/deploy.js --network polygon`
5. Set `RPC_URL` and `CONTRACT_ADDRESS` in Render to the Polygon values
6. Keep Sepolia as `NODE_ENV=development` network in `blockchain.js`

---

## Next 4 Weeks

### Week 2 — Observability & CI Hardening

**Sentry setup (4 hours):**
- `npm install @sentry/node` in server, `@sentry/react` in client
- Add `Sentry.init()` to `server/index.js` before any routes
- Wrap Express error handler with `Sentry.Handlers.errorHandler()`
- Set `SENTRY_DSN` in Render env — free tier covers 5,000 errors/month

**Fix CI linting (2 hours):**
- Add `.eslintrc.json` with `eslint:recommended` + `plugin:node/recommended`
- Replace the `echo "Linting skipped"` stub in `ci.yml` with `npm run lint`
- This gates every deploy on clean code

**Grafana Cloud dashboard (3 hours):**
- Prometheus metrics endpoint already exists and is collecting data
- Create a free Grafana Cloud account → connect to the `/metrics` endpoint
- Build four panels: issuance rate, anchor latency p95, verification volume, OTP delivery rate
- Set alert: anchor latency p95 > 30s → PagerDuty or email

### Week 3 — Verifier Portal Completion

The verifier role and page exist but the core workflow is incomplete. This is the B2B acquisition surface.

**Bulk CSV verification:**
- `POST /api/verify/bulk` accepts CSV with student emails or certificate IDs
- Returns JSON with chain verification result per row
- UI: drag-drop CSV → results table with pass/fail badges

**Employer API keys:**
- Add `ApiKey` model (hashed key, universityId or verifierId, rateLimit, lastUsed)
- Middleware: `Authorization: Bearer ek_live_xxx` → bypass JWT, check key validity
- Verifier dashboard → "Generate API Key" → copy to HR system

**Embeddable verification widget:**
- Single JS snippet: `<script src="https://educred.in/verify.js" data-cert="EC-2024-XXX"></script>`
- Renders a trust badge inline on any HR portal or LinkedIn-equivalent

### Week 4 — Razorpay Billing Foundation

Without billing EduCred is a free public good, not a company.

**Subscription tiers:**

| Plan | Price (INR/month) | Limit |
|------|-------------------|-------|
| Starter | ₹2,999 | 500 certificates |
| Growth | ₹9,999 | 5,000 certificates |
| Enterprise | ₹49,999+ | Unlimited + SLA |

**Implementation:**
1. `npm install razorpay` — Razorpay has better India coverage than Stripe
2. Add `Subscription` model: `universityId`, `plan`, `certificatesUsed`, `billingCycleEnd`
3. Middleware on `POST /api/certificates/issue`: check `certificatesUsed < plan.limit` before anchoring
4. Razorpay webhook → update `certificatesUsed` + handle payment failures
5. University dashboard: usage meter showing X / 500 certificates this month

---

## Month 2 — Enterprise & Compliance

### DPDPA 2023 Compliance (Required before paid rollout)

India's Digital Personal Data Protection Act 2023 creates real liability if ignored.

- Consent capture at registration with granular checkboxes (not a wall of text)
- `DELETE /api/user/me` — erases PII fields, preserves anonymized audit trail
- Data export: `GET /api/user/me/export` → JSON of all personal data
- Privacy notice + Data Processing Agreement template for university customers
- Log all data access in `AuditLog` with purpose field

### AICTE / UGC University Validation

During university onboarding, auto-validate against government lists:
- Query AICTE API with approval number → confirm institution is recognized
- Cross-reference UGC approved university list
- Store `aicteApprovalNumber`, `ugcRecognized` on `University` model
- This makes every certificate anchored on EduCred implicitly government-traceable

### Database Performance

- Add `CONCURRENTLY` GIN index on `Certificate.metadata` for JSON queries
- Add composite index `(universityId, createdAt)` for dashboard time-range queries
- Configure Sequelize connection pool: `pool: { max: 10, min: 2, acquire: 30000 }`
- PgBouncer proxy in front of Postgres on Render Standard plan

### W3C Verifiable Credentials (VC 2.0) Stub

Issue a JSON-LD VC alongside every PDF:
- `npm install @spruceid/didkit-wasm-node`
- University gets a `did:ethr` identifier at onboarding
- On issuance: generate VC JSON signed by university DID → store alongside PDF CID
- Student can download and share the VC with any W3C-compatible wallet
- Groundwork for Open Badges 3.0 and EU Europass alignment

---

## Month 3 — Scale, SaaS & India Market

### Kubernetes on AWS Mumbai

- Dockerize: `educred-api`, `educred-worker`, `educred-frontend`, `redis`, `pgbouncer`
- Helm chart for one-command deploy
- AWS ECS Fargate as the managed step before full K8s
- Mumbai region primary (India data localization) + Singapore DR

### Mobile: PWA First, React Native Second

80% of India's internet users are mobile-first. Employers verify credentials on phones.

**PWA (2 weeks):**
- Add `manifest.json` and service worker to the Vite React app
- Offline cache for recently verified certificates
- Web Push API for certificate status updates (issued, anchored, ready)

**React Native (2 months):**
- QR scanner for instant verification — point phone at printed certificate
- Student digital wallet: all certificates stored offline
- Biometric auth for university admin actions

### AI Fraud Intelligence

The `FraudAlert` model exists. The `HASH_MISMATCH` and `WALLET_MISMATCH` signals are stored. The next layer is pattern detection:
- Velocity rule: >50 verifications of the same certificate in 1 hour → auto-flag + notify admin
- Network rule: same IP verifying certificates from 10+ different students → fraud signal
- Anomaly: batch issuance of 100+ certificates between 2am–5am → requires admin confirmation before anchoring
- Python FastAPI microservice with scikit-learn, called by the BullMQ worker post-anchor

### Academic Bank of Credits (ABC) Integration

ABC is India's national credit transfer system. Integration makes EduCred the bridge between every university and every employer via the government's own identity layer:
- Map certificate fields to ABC credit format
- Export certificates as APAAR-compatible records
- Deep DigiLocker integration: push issued certificates directly into student's DigiLocker vault

---

## Architecture Evolution

```
NOW (May 2026)
──────────────────────────────────────────
Render Monolith
  BullMQ (active) → Redis (needs REDIS_URL)
  Sepolia testnet → Polygon Mainnet needed
  Prometheus + Winston → no dashboard yet
  DigiLocker service → env vars needed
  CI/CD pipeline → linting disabled

MONTH 1 TARGET
──────────────────────────────────────────
Render Standard ($25/mo, no cold starts)
  BullMQ + Upstash Redis → fully async
  Polygon Mainnet → real trust
  Sentry + Grafana Cloud → full visibility
  DigiLocker production → India KYC live
  Razorpay billing → revenue flowing

MONTH 3 TARGET
──────────────────────────────────────────
AWS ECS Mumbai (multi-instance)
  ├── API (3 replicas)
  ├── BullMQ Workers (5 replicas)
  ├── Notification Worker
  └── AI Fraud Service (Python)
Redis Cluster (Upstash)
Postgres + Read Replica + PgBouncer
Polygon Mainnet (primary) + Sepolia (staging)
React Native app (Play Store + App Store)
Razorpay + Stripe subscriptions live
DPDPA compliant → enterprise contracts possible
```

---

## Critical Path to 8/10 Production Score

In order. Each depends on the previous.

1. **Set `REDIS_URL` on Render** — activates BullMQ, eliminates sync blockchain hangs
2. **Wire DigiLocker env vars** — India KYC live, major trust signal for universities
3. **Deploy to Polygon Mainnet** — certificates become legally and technically real
4. **Sentry + Grafana alerts** — you find out about failures before users do
5. **Razorpay billing** — EduCred becomes a company, not a side project
6. **DPDPA consent + erasure** — required before any paid institutional contract

Completing steps 1–3 brings the score to **7.5 / 10** and makes EduCred demo-ready for real Indian universities.  
Completing all six brings it to **8.5 / 10** and makes it commercially launchable.

---

## Engineering Principles (Unchanged)

- One anchoring pipeline: HTTP routes enqueue; BullMQ workers do blockchain + IPFS + PDF + notification.
- No synchronous blockchain writes inside request cycles, ever.
- DB-only verification must surface as `status: "degraded"` — never fake trust.
- Production features degrade safely when optional infrastructure is absent.
- No duplicate issuance logic between admin approval, university retry, and student request flows.
