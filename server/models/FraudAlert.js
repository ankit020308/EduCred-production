import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FraudAlert = sequelize.define('FraudAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  alertType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  severity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  context: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  isReviewed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reviewedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['severity'] },
    { fields: ['isReviewed'] },
    { fields: ['createdAt'] },
  ],
});

export default FraudAlert;
