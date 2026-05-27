import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ApiKey = sequelize.define('ApiKey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Friendly label set by the user
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  // SHA-256 hash of the raw key — never store plaintext
  keyHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  // Safe display prefix only (e.g. "ek_live_…abcd")
  keyPrefix: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  // Owner user ID
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  // Role of the owner at key creation time
  ownerRole: {
    type: DataTypes.ENUM('university', 'verifier'),
    allowNull: false,
  },
  // For university keys: the institution ID for downstream access checks
  institutionId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // Requests per minute ceiling (0 = unlimited)
  rateLimit: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    allowNull: false,
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  // Soft-expire a key at a specific UTC timestamp
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  indexes: [
    { unique: true, fields: ['keyHash'] },
    { fields: ['ownerId'] },
    { fields: ['institutionId'] },
  ],
});

export default ApiKey;
