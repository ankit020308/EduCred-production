# EduCred: Master Hardening Edition
### Enterprise Blockchain Credential Infrastructure

EduCred is a hardened, production-grade digital credentialing platform that leverages blockchain technology to ensure the authenticity, immutability, and public verifiability of academic records.

---

## 🛡️ Master Architecture & Hardening

The current version of EduCred has been integrated with the **Master Hardening Protocol**, ensuring enterprise-grade resilience and non-repudiation.

### 1. Fail-Fast Blockchain Integrity
The system employs a strict, fail-fast blockchain service (`server/utils/blockchain.js`). Unlike legacy prototypes, this edition:
- Eliminates all mock receipts and fallbacks.
- Requires explicit on-chain confirmation before database finalization.
- Automatically transitions to **OFFLINE (Safe Mode)** if the RPC provider fails, protecting system state.

### 2. Secure KeyVault (AES-256-GCM)
Institutional signing keys are never stored in plaintext. The `keyVault.js` integration provides:
- **AES-256-GCM Encryption**: Industry-standard authenticated encryption for all sensitive signers.
- **Environment Gating**: Decryption requires a restricted `WALLET_ENCRYPTION_KEY`, ensuring split-knowledge security.
- **Strict Validation**: Malformed or legacy plaintext secrets are immediately rejected with security alerts.

### 3. Migration-Based Schema Management
Runtime schema mutations have been disabled in favor of a robust, manual migration workflow.
- **apply-hardening-migration.js**: An idempotent script that ensures unique constraints and audit tables are correctly initialized.
- **Idempotency**: All operations (table creation, index enforcement) are existence-checked to prevent deployment collisions.

---

## 🚀 Key Features

- **Institutional Issuance**: Secure Institution Portals verified by system administrators.
- **Trustless Verification**: Public portal supporting file-based and ID-based cryptographic verification.
- **Real-Time Visibility**: Live blockchain status monitoring directly from the dashboard.
- **Decentralized Anchoring**: Direct anchoring of SHA-256 hashes to the Ethereum ledger.

---

## 🛠️ System Stack

- **Frontend**: React (Vite) + Sapphire Design System (Vanilla CSS).
- **Backend**: Node.js (Express) + Sequelize ORM.
- **Blockchain**: Solidity + Ethers.js v6.
- **Real-Time**: Socket.io for institutional event streaming.

---

## 📦 Deployment & Setup

### 1. Environment Configuration
Populate `.env` based on `.env.example`. **Critical production variables:**
- `WALLET_ENCRYPTION_KEY`: A 32-character secure salt for signers.
- `RPC_URL`: Your authoritative blockchain RPC provider.
- `PRIVATE_KEY`: The master system treasury key.

### 2. Initialization
```bash
# 1. Install dependencies
npm install

# 2. Apply hardening migration
node server/scripts/apply-hardening-migration.js

# 3. Launch platform
npm run dev
```

---

## 🔒 Security Model

- **Non-Repudiation**: Every record is cryptographically tied to an authorized institution.
- **Privacy First**: No PII is stored on-chain; only hashes are public.
- **Zero-Trust Verification**: Recounting bits to ensure bit-perfect verification matches on-chain state.

---
© 2026 EduCred. *Authenticity should be verifiable, not dependent on trust.*
