import sequelize from '../config/database.js';
import { logger } from '../utils/winstonLogger.js';
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
  otpRecords: Models.OtpRecord,
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
      'OtpRecords',
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
      logger.info('[Registry] Initializing SQL storage protocol...');
      logger.info(`[Registry] [DIAGNOSTIC] Checking connectivity to: ${sequelize.options.host || 'remote node'}`);
      
      await sequelize.authenticate();
      logger.info('[Registry] [SUCCESS] Connection established. Verifying schema...');
      
      await this._verifySchema();
      this.isReady = true;
      logger.info('[Registry] [SUCCESS] SQL storage layer active and verified.');
      return true;
    } catch (error) {
      logger.error(`\n[Registry] [FAIL] [INIT_ERROR] Database connection failed.`);
      logger.error(`[Registry] [REASON] ${error.message}`);
      
      if (error.original) {
        logger.error(`[Registry] [OS_DETAIL] ${error.original.code} - ${error.original.address}:${error.original.port}`);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        logger.error('[Registry] [HELP] The database seems unreachable. Verify your DATABASE_URL in .env and ensure your local IP is whitelisted if using a managed host like Render.');
      } else if (error.message.includes('no pg_hba.conf entry')) {
        logger.error('[Registry] [HELP] Connection rejected by database server. This usually means SSL is required but not active, or the credentials are wrong.');
      }

      throw new Error(`Database connection failed: ${error.message}. EduCred requires an active database node to function.`);
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
    logger.info(`[Registry] [INSERT] Collection: ${collection}`);
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

  getSequelize() {
    return sequelize;
  }

  async transaction(callback) {
    return sequelize.transaction(callback);
  }

  _parseQuery(query) {
    if (!query || typeof query !== 'object') return query;
    const parsed = {};

    Object.keys(query).forEach(key => {
      let value = query[key];

      // Recursively parse nested objects or arrays
      if (Array.isArray(value)) {
        value = value.map(v => this._parseQuery(v));
      } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        value = this._parseQuery(value);
      }

      // Map Mongo-style operators to Sequelize equivalents
      if (key === '$or') {
        parsed[Op.or] = value;
      } else if (key === '$and') {
        parsed[Op.and] = value;
      } else if (key === '$gt') {
        parsed[Op.gt] = value;
      } else if (key === '$gte') {
        parsed[Op.gte] = value;
      } else if (key === '$lt') {
        parsed[Op.lt] = value;
      } else if (key === '$lte') {
        parsed[Op.lte] = value;
      } else if (key === '$ne') {
        parsed[Op.ne] = value;
      } else if (key === '$in') {
        parsed[Op.in] = value;
      } else if (key === '$like') {
        parsed[Op.like] = value;
      } else {
        parsed[key] = value;
      }
    });

    return parsed;
  }
}

const Registry = new RegistryService();
export default Registry;
