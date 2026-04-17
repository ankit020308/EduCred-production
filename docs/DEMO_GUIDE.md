# EduCred: Official Demo Playbook

This guide walk you through the full operational lifecycle of the EduCred platform, from starting the blockchain to performing a real-time verification demo.

## 1. System Preparation

Before starting, ensure your system is clean and dependencies are ready.

### **Step A: Reset to Factory State**
Remove all dummy data and older records:
```bash
npm run system:reset
```
*Creates a fresh admin: `ankitaman0003@gmail.com` / `Ankit@123Am`*

### **Step B: Install Dependencies**
Ensure all sub-packages (blockchain, server, client) have their dependencies:
```bash
npm run install:all
```

---

## 2. Launching the Identity Node

The system is equipped with an orchestration script that starts all services in the correct order.

```bash
# In the project root
node scripts/start.js
```

**Services will start sequentially:**
1. **Ganache**: Local blockchain on `8545`.
2. **Contract**: Smart contract deployed and anchored.
3. **Backend**: Node.js API on `5001`.
4. **Frontend**: Vite Dev Server on `3000`.

---

## 3. Demo Sequence (The Golden Path)

### **Stage 1: Institutional Issuance**
1. Navigate to **[http://localhost:3000/login](http://localhost:3000/login)**.
2. Login as the University:
   - **Email**: `ankitaman0003@gmail.com`
   - **Password**: `Ankit@123Am`
3. Go to the **Authority Node** (Admin Dashboard).
4. Click **"Issue Certificate"**.
5. Fill in student details and upload a PDF.
6. **Watch the logs**: You will see the SHA-256 hash generation, IPFS pinning, and the blockchain transaction firing.

### **Stage 2: Public Verification**
1. Navigate to **[http://localhost:3000/verify](http://localhost:3000/verify)** (Public Portal).
2. **Method A (ID Lookup)**: Paste the Certificate ID generated in Stage 1.
3. **Method B (File Upload)**: Upload the exact same PDF you just issued.
4. **Result**: The system will re-hash the file, check the Ganache ledger, and display "✅ Authentic Record Found" with IPFS storage details.

### **Stage 3: Real-time Analytics**
1. Open two browser windows: **Admin Dashboard** and **Public Portal**.
2. Issue another certificate or update an application status.
3. **Observe**: The Admin charts (Recharts) will update instantly via Socket.io without a page refresh when the blockchain event is detected.

---

## 4. Verification for Demo

To prove the system's integrity during a demo:

1. **Tamper Test**: Take your issued PDF, open it in an editor, add a single dot, and save it. Try to verify it.
   - *Result*: The system will detect a hash mismatch and display "❌ Tampered or Invalid Record".
2. **Ledger Audit**: Show the **Institutional Ledger** table in the Admin dashboard. It displays the bit-perfect SHA-256 fingerprints mirrored from the blockchain.

---

## 5. Troubleshooting
- **Blockchain Disconnect**: If Ganache stops, restart with `node start.js`.
- **IPFS Issues**: Ensure `PINATA_JWT` is set in `server/.env`.
- **Port Conflicts**: Ensure ports `8545`, `5001`, and `3000` are free.
