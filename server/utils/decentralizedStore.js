import { promises as fsAsync, existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { uploadJSONToPinata, isPinataConfigured } from './ipfsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

/**
 * ─── EduCred: Decentralized Store ──────────────────────────────────────────
 * * An in-memory, local-first JSON datastore with IPFS pinning.
 * Features:
 * - Async non-blocking I/O to prevent event-loop starvation.
 * - Atomic writes (temp file renaming) to prevent corruption on crash.
 * - Write queuing to prevent race conditions during high concurrency.
 * - Cryptographically secure UUID generation.
 */
class DecentralizedStore {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    this.tempFilePath = path.join(DATA_DIR, `${collectionName}.tmp.json`);
    this.data = [];

    // Promise queue to prevent concurrent writes from corrupting the file
    this._writeLock = Promise.resolve();

    this._ensureDir();
    this._loadSync(); // Initial load blocks startup only once, which is safe.
  }

  /**
   * Ensures the data directory exists synchronously on boot.
   */
  _ensureDir() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Initial synchronous load during server startup.
   */
  _loadSync() {
    if (existsSync(this.filePath)) {
      try {
        const raw = readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error(`❌ [Store:${this.collectionName}] Corruption detected on load. Resetting collection. Error:`, err.message);
        this.data = [];
      }
    } else {
      this.data = [];
      // Don't block to save an empty array, fire async save
      this.save().catch(console.error);
    }
  }

  /**
   * Safely writes the current state to disk using atomic operations and a write queue.
   * @returns {Promise<void>}
   */
  async save() {
    // Queue writes to prevent race conditions
    this._writeLock = this._writeLock.then(async () => {
      try {
        const jsonData = JSON.stringify(this.data, null, 2);

        // 1. Write to a temporary file first
        await fsAsync.writeFile(this.tempFilePath, jsonData, 'utf-8');

        // 2. Atomically rename temp file to actual file (prevents corruption if server crashes mid-write)
        await fsAsync.rename(this.tempFilePath, this.filePath);

        // 3. Background IPFS backup (fire and forget)
        this._triggerBackgroundIPFS();
      } catch (err) {
        console.error(`❌ [Store:${this.collectionName}] Save failed:`, err.message);
        throw err;
      }
    }).catch(err => {
      console.error(`❌ [Store:${this.collectionName}] Queue processing error:`, err.message);
    });

    return this._writeLock;
  }

  /**
   * Handles IPFS uploads without blocking the main save queue.
   */
  async _triggerBackgroundIPFS() {
    if (!isPinataConfigured() || this.data.length === 0) return;

    try {
      const pinName = `EduCred-Registry-${this.collectionName}-${new Date().toISOString().split('T')[0]}`;
      await uploadJSONToPinata(this.data, pinName);
      // console.log(`✅ [Store:${this.collectionName}] IPFS Snapshot updated.`);
    } catch (err) {
      console.warn(`⚠️ [Store:${this.collectionName}] IPFS Backup delayed:`, err.message);
    }
  }

  // ─── Query Methods (Run entirely in-memory for speed) ─────────────

  find(query = {}) {
    return this.data.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
  }

  findOne(query = {}) {
    return this.data.find(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
  }

  // ─── Mutation Methods ─────────────────────────────────────────────

  async create(doc) {
    const newDoc = {
      _id: crypto.randomUUID(), // Cryptographically secure ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...doc
    };

    this.data.push(newDoc);
    await this.save();
    return newDoc;
  }

  async updateOne(query, update) {
    const index = this.data.findIndex(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });

    if (index !== -1) {
      this.data[index] = {
        ...this.data[index],
        ...update,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.data[index];
    }
    return null;
  }

  async countDocuments(query = {}) {
    return this.find(query).length;
  }

  async deleteOne(query) {
    const startLen = this.data.length;
    this.data = this.data.filter(item => {
      return !Object.entries(query).every(([key, value]) => item[key] === value);
    });

    if (this.data.length !== startLen) {
      await this.save();
      return true;
    }
    return false;
  }
}

// Singleton instances for common collections
export const UserStore = new DecentralizedStore('users');
export const CertificateStore = new DecentralizedStore('certificates');
export const UniversityStore = new DecentralizedStore('universities');
export const StudentStore = new DecentralizedStore('students');
export const LedgerStore = new DecentralizedStore('ledger');
export const VerificationLogStore = new DecentralizedStore('verification_logs');

export default DecentralizedStore;