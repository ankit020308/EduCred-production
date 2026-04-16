// server/services/registryService.js
import sequelize from '../config/database.js';
import * as Models from '../models/index.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

/**
 * 🔀 Registry Adapter (Resilient Edition)
 * Maps logic to SQL by default, with an automatic in-memory Simulation Mode fallback.
 */
const COLLECTION_MODEL_MAP = {
    users: Models.User,
    universities: Models.University,
    students: Models.Student,
    certificates: Models.Certificate,
    ledger: Models.Ledger,
    auditLogs: Models.AuditLog
};

class RegistryService {
    constructor() {
        this.models = COLLECTION_MODEL_MAP;
        this.isSimulation = false;
        this.store = {
            users: [],
            universities: [],
            students: [],
            certificates: [],
            ledger: [],
            auditLogs: []
        };
    }

    /**
     * 🛡️ Initialises the database connection and syncs models.
     * Falls back to Simulation Mode if DB is unreachable.
     */
    async init() {
        try {
            console.log('[Registry] Initializing SQL storage protocol...');
            
            // Explicitly verify connection
            await sequelize.authenticate();
            
            // Sync models (Safe by default, alter handles schema diffs)
            const syncMode = process.env.DB_FORCE_SYNC === 'true' ? { force: true } : { alter: true };
            await sequelize.sync(syncMode);
            
            console.log('✅ [Registry] SQL storage layer active & synced.');
            this.isSimulation = false;
            return true;
        } catch (error) {
            // Production MUST have a functional database
            if (process.env.NODE_ENV === 'production') {
                console.error(`[Registry_CRITICAL] 🚨 Database connection failed: ${error.message}`);
                throw new Error('Database connection failed. Registry cannot initialize in production.');
            }

            // Development fallback to Simulation Mode
            console.warn(`⚠️ [Registry] Database connection failed: ${error.message}`);
            if (error.original) {
                console.warn(`🔍 [Detail]: ${error.original.code} - ${error.original.address}:${error.original.port}`);
            }
            console.info('🚀 [Registry] Falling back to SIMULATION MODE (In-Memory).');
            this.isSimulation = true;
            return true; 
        }
    }

    /**
     * 🔍 Find Documents
     */
    async find(collection, query = {}) {
        if (this.isSimulation) {
            return this.store[collection]?.filter(item => this._match(item, query)) || [];
        }

        const Model = this.models[collection];
        if (!Model) return [];
        const where = this._parseQuery(query);
        return await Model.findAll({ where });
    }

    async findOne(collection, query = {}) {
        if (this.isSimulation) {
            return this.store[collection]?.find(item => this._match(item, query)) || null;
        }

        const Model = this.models[collection];
        if (!Model) return null;
        const where = this._parseQuery(query);
        return await Model.findOne({ where });
    }

    async findById(collection, id) {
        if (this.isSimulation) {
            return this.store[collection]?.find(item => item.id === id) || null;
        }

        const Model = this.models[collection];
        if (!Model) return null;
        return await Model.findByPk(id);
    }

    /**
     * 📝 Insert Document
     */
    async insert(collection, document) {
        if (this.isSimulation) {
            const newItem = { 
                ...document, 
                id: document.id || crypto.randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.store[collection].push(newItem);
            return newItem;
        }

        const Model = this.models[collection];
        if (!Model) return document;
        const { _id, ...cleanDoc } = document;
        const result = await Model.create(cleanDoc);
        return result.get({ plain: true }); // Use get({ plain: true }) for clean POJO
    }

    /**
     * 🔄 Update Documents
     */
    async update(collection, query, updateData) {
        if (this.isSimulation) {
            const items = this.store[collection].filter(item => this._match(item, query));
            items.forEach(item => {
                Object.assign(item, updateData);
                item.updatedAt = new Date();
            });
            return items;
        }

        const Model = this.models[collection];
        if (!Model) return [];
        const where = this._parseQuery(query);
        await Model.update(updateData, { where });
        return this.find(collection, where);
    }

    /**
     * 🗑️ Delete Documents
     */
    async delete(collection, query) {
        if (this.isSimulation) {
            this.store[collection] = this.store[collection].filter(item => !this._match(item, query));
            return;
        }

        const Model = this.models[collection];
        if (!Model) return;
        const where = this._parseQuery(query);
        await Model.destroy({ where });
    }

    async count(collection, query = {}) {
        if (this.isSimulation) {
            return this.store[collection].filter(item => this._match(item, query)).length;
        }

        const Model = this.models[collection];
        if (!Model) return 0;
        const where = this._parseQuery(query);
        return await Model.count({ where });
    }

    /**
     * 🛠️ Query Parser & Matcher
     */
    _match(item, query) {
        return Object.entries(query).every(([key, value]) => {
            if (key === '$or') {
                return value.some(condition => this._match(item, condition));
            }
            return item[key] === value;
        });
    }

    _parseQuery(query) {
        const parsed = { ...query };
        if (query.$or) {
            parsed[Op.or] = query.$or;
            delete parsed.$or;
        }
        return parsed;
    }
}

const Registry = new RegistryService();
export default Registry;
