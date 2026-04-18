import sequelize from '../config/database.js';
import * as Models from '../models/index.js';
import { Op } from 'sequelize';

const COLLECTION_MODEL_MAP = {
  users: Models.User,
  universities: Models.University,
  students: Models.Student,
  certificates: Models.Certificate,
  ledger: Models.Ledger,
  auditLogs: Models.AuditLog,
  blacklistedTokens: Models.BlacklistedToken,
  requests: Models.Request,
  fraudAlerts: Models.FraudAlert,
  verificationLogs: Models.VerificationLog,
};

class RegistryService {
  constructor() {
    this.models = COLLECTION_MODEL_MAP;
    this.isReady = false;
    this.isSimulation = false;
  }

  _getModel(collection) {
    const Model = this.models[collection];
    if (!Model) {
      throw new Error(`Unsupported registry collection: ${collection}`);
    }

    return Model;
  }

  async _verifySchema() {
    const queryInterface = sequelize.getQueryInterface();
    const requiredTables = [
      'User',
      'University',
      'Student',
      'Certificate',
      'Ledger',
      'AuditLog',
      'blacklistedTokens',
      'Request',
      'FraudAlert',
      'VerificationLog',
    ];

    for (const tableName of requiredTables) {
      await queryInterface.describeTable(tableName);
    }

    const certificateIndexes = await queryInterface.showIndex('Certificate');
    const uniqueFields = new Set(
      certificateIndexes
        .filter((index) => index.unique)
        .flatMap((index) => index.fields.map((field) => field.attribute || field.name))
    );

    for (const field of ['certificateId', 'certificateHash']) {
      if (!uniqueFields.has(field)) {
        throw new Error(`Database schema is missing the required unique index on Certificate.${field}.`);
      }
    }
  }

  async init() {
    try {
      console.log('[Registry] Initializing SQL storage protocol...');
      await sequelize.authenticate();
      await this._verifySchema();
      this.isReady = true;
      console.log('[Registry] [SUCCESS] SQL storage layer active.');
      return true;
    } catch (error) {
      console.error(`[Registry] [ERROR] Database connection failed: ${error.message}`);
      if (error.original) {
        console.error(`[Registry] [INFO] Detail: ${error.original.code} - ${error.original.address}:${error.original.port}`);
      }
      throw new Error('Database connection failed or schema is unsafe. EduCred requires a migrated database to run.');
    }
  }

  async find(collection, query = {}, options = {}) {
    const Model = this._getModel(collection);
    const where = this._parseQuery(query);
    return Model.findAll({ where, ...options });
  }

  async findOne(collection, query = {}, options = {}) {
    const Model = this._getModel(collection);
    const where = this._parseQuery(query);
    return Model.findOne({ where, ...options });
  }

  async findById(collection, id, options = {}) {
    const Model = this._getModel(collection);
    return Model.findByPk(id, options);
  }

  async insert(collection, document, options = {}) {
    const Model = this._getModel(collection);
    console.log(`[Registry] [INSERT] Collection: ${collection}`);
    const { _id, ...cleanDoc } = document;
    const result = await Model.create(cleanDoc, options);
    return result.get({ plain: true });
  }

  async create(...args) {
    return this.insert(...args);
  }

  async update(collection, query, updateData, options = {}) {
    const Model = this._getModel(collection);
    const where = this._parseQuery(query);
    await Model.update(updateData, { where, ...options });
    return this.find(collection, query, options.transaction ? { transaction: options.transaction } : {});
  }

  async delete(collection, query, options = {}) {
    const Model = this._getModel(collection);
    const where = this._parseQuery(query);
    await Model.destroy({ where, ...options });
  }

  async count(collection, query = {}, options = {}) {
    const Model = this._getModel(collection);
    const where = this._parseQuery(query);
    return Model.count({ where, ...options });
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
