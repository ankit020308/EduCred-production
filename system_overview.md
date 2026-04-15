# EduCred: System Progress & Technical Overview (VC Pivot)

This document provides a comprehensive update on the **EduCred** project's new architecture centered on **Verifiable Credentials (VCs)** and **Real-Time Blockchain Analytics**.

---

## 🚀 Current Architectural Pivot

| Component | status | Change Description |
|---|---|---|
| **Smart Contract** | **OVERHAULED** | Switched from internal IDs to `bytes32` hash mappings & `ApplicationRecord` structs. |
| **Backend** | **INTEGRATED** | Deterministic JSON sorting + SHA-256 pipeline implemented. |
| **Storage (IPFS)**| **DEPLOYED** | Integrated Pinata v2 SDK for decentralized file pinning (IPFS) with local fallback. |
| **Frontend** | **REAL-TIME** | Ethers.js event listeners (Status & Issuance) integrated for live graph updates. |

---

## 🛠️ Exact Technical Flow

### 1. Issuance (Academic Credentialing)
1.  **Home Univ Admin**: Inputs student data and uploads the certificate file.
2.  **Cryptographic Fingerprinting**: Backend computes a **SHA-256 hash of the raw binary file content**.
3.  **Decentralized Pinning**: The file is streamed to **IPFS via Pinata**. The resulting **CID** (Content Identifier) is recorded.
4.  **On-Chain Anchoring**: ONLY the file hash is anchored to the Ganache smart contract (`issueCertificate`).
5.  **Credential Retrieval**: The student accesses their certificate via a permanent IPFS gateway link.

### 2. Application (Student-to-Verifier)
1.  **Student**: Submits their JSON credential directly to a Foreign University off-chain.
2.  **No Blockchain Required**: This step is peer-to-peer.

### 3. Verification & Real-Time Analytics (Verifier)
1.  **Verifier**: Uploads/Posts the JSON file to the Verification Portal.
2.  **Re-Hashing**: Backend re-hashes the JSON using the same deterministic logic.
3.  **Blockchain Query**: System calls `verifyCertificate(bytes32 _hash)` to check for a match.
4.  **Log Application Event**: If valid, the Verifier can call `updateApplicationStatus(...)` to record a status change (Pending/Accepted/Rejected).
5.  **Live Updates**: All administrative dashboards listen to **Contract Events** in real-time, updating graphs (Recharts) automatically when any verifier updates a status.

---

## 📊 REAL-TIME DASHBOARD SPECS
- **Credential Output**: Tracks total issued certificates via `CertificateIssued` event.
- **Application Flow**: Tracks overall acceptance rates and processing volume through `ApplicationStatusUpdated` events.
- **Async Synchronization**: React state is updated automatically via the `ethers.js` hook, removing the need for polling or database-heavy stats queries.

---

## ⚠️ Known Implementation Details
- **Ethers.js v6.x**: Used for both server and client side interaction.
- **Hardhat Node**: Local node at `http://127.0.0.1:8545`.
- **JSON Sorting**: Alphabetical sorting is mandatory for consistent hashing.
