# 🚀 EduCred: Live Hosting & Deployment Guide

This guide outlines the professional deployment workflow for the EduCred platform, ensuring cryptographic security and high-performance "Liquid Glass" rendering in production.

---

## 🏗️ 1. Architecture Overview
*   **Frontend**: React + Vite (Optimized for Vercel/Netlify)
*   **Backend**: Node.js/Express (Optimized for Render/Railway/Heroku)
*   **Blockchain**: Hardhat Node (Development) or Alchemy/Infura RPC (Production)
*   **Database**: PostgreSQL (Managed Service seperti Neon/Supabase/Render)

---

## 🔒 2. Required Environment Variables
You MUST set these variables in your hosting provider's dashboard before launching.

### Backend (`/server`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Node server port | `5001` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgres://user:pass@host:5432/db` |
| `RPC_URL` | Public Blockchain RPC (Polygon/Ethereum/Goerli) | `https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| `PRIVATE_KEY` | Institutional Admin Wallet Private Key | `0x... (Keep Secure!)` |
| `JWT_SECRET` | Secret for Authentication Tokens | `a_long_random_string_here` |
| `CLIENT_URL` | The live URL of your React frontend | `https://educred-client.vercel.app` |

### Frontend (`/client`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | The live URL of your Express backend | `https://educred-api.onrender.com` |

---

## 🚀 3. Deployment Steps

### Phase A: Backend (e.g., Render.com)
1.  **Repository**: Root folder of this project.
2.  **Root Directory**: `server`
3.  **Build Command**: `npm install`
4.  **Start Command**: `node index.js`
5.  **Environment Variables**: Input all variables from Section 2.

### Phase B: Frontend (e.g., Vercel.com)
1.  **Repository**: Root folder of this project.
2.  **Framework Preset**: `Vite`
3.  **Root Directory**: `client`
4.  **Build Command**: `npm run build`
5.  **Output Directory**: `dist`
6.  **Environment Variables**: Add `VITE_API_URL`.

---

## ⚠️ 4. Post-Deployment Checklist
1.  **CORS Validation**: Verify that the `CLIENT_URL` in the backend matches your Vercel URL exactly.
2.  **Gas Check**: Ensure the Institutional Wallet (`PRIVATE_KEY`) has enough native currency (ETH/MATIC) to anchor certificates.
3.  **Hash Sync**: Confirm the `EduCred.json` ABI is identical in both `client/src` and `server/utils` (the deployment script handles this locally).

---

## 💎 Design Consistency
The **Liquid Glass** background system is optimized for production. It uses `requestAnimationFrame` and `Canvas` to ensure smooth 60fps performance even on low-tier hosting environments.
