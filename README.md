# EduCred: Enterprise Academic Infrastructure

EduCred is a production-grade, decentralized platform designed for the secure issuance and verification of academic credentials. By leveraging the Ethereum blockchain as an authoritative immutable ledger and IPFS for distributed storage, EduCred eliminates certificate fraud and solves the "Single Point of Failure" risk inherent in centralized registrar systems.

---

## Core Philosophy

Traditional verification systems rely on binary file hashing or manual database lookups. EduCred introduces **Structural Hashing**, a deterministic data fingerprinting model that ensures certificates remain verifiable even if the underlying PDF formatting or container is altered. Authenticity is anchored on-chain and signed by sovereign university wallets, ensuring absolute non-repudiation.

---

## Key Features

*   Institutional Sovereignty: Each university controls its own blockchain identity and signing keys.
*   Structural Integrity: Deterministic JSON hashing ensures semantic data validity.
*   Asynchronous Pipeline: High-performance background processing using BullMQ and Redis.
*   Distributed Storage: Peer-to-peer file persistence via IPFS.
*   Trustless Verification: Public portal for instant, zero-trust validation of academic claims.

---

## Technical Stack

*   Frontend: React, Tailwind CSS, Framer Motion
*   Backend: Node.js, Express, BullMQ
*   Persistence: PostgreSQL (Registry), Redis (Job Queue), IPFS (Files)
*   Blockchain: Solidity, Ethereum (Sepolia Testnet), Ethers.js

---

## Project Structure

```text
/EduCred
├── /client      # React Enterprise UI & Dashboards
├── /server      # API Gateway & BullMQ Background Workers
├── /blockchain  # Smart Contracts & Ledger Configuration
├── /docs        # Technical Specifications & Architecture Reports
├── /scripts     # Full-Stack Orchestration & System Diagnostics
└── /deploy      # Infrastructure-as-code & Cloud Configs
```

---

## Getting Started

### Prerequisites

*   Node.js (v18+)
*   Redis (running on localhost:6379)
*   Sepolia testnet ETH (for institutional wallets)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ankit020308/EduCred.git
   cd EduCred
   ```

2. Install all dependencies:
   ```bash
   npm run install:all
   ```

3. Launch the full-stack environment:
   ```bash
   npm start
   ```

---

## Documentation

Comprehensive guides are available in the `docs/` directory:
*   Architecture Blueprint: [ARCHITECTURE.md](docs/ARCHITECTURE.md)
*   Security Analysis Report: [ANALYSIS_REPORT.md](docs/ANALYSIS_REPORT.md)
*   Manual Demo Guide: [DEMO_GUIDE.md](docs/DEMO_GUIDE.md)

---

## Author

Ankit  
BTech Computer Science | Blockchain Infrastructure Enthusiast
