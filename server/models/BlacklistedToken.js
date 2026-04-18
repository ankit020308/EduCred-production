import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * 🛡️ Security Model: BlacklistedToken
 * Stores revoked JWTs to prevent re-use after logout.
 * These are automatically cleaned up after expiry to maintain performance.
 */
const BlacklistedToken = sequelize.define('blacklistedTokens', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  timestamps: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['token']
    }
  ]
});

export default BlacklistedToken;
