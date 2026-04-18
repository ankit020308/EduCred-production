import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const VerificationLog = sequelize.define('VerificationLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  certificateId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  verificationMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  result: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  verifierIp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  submittedHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  indexes: [
    { fields: ['certificateId'] },
    { fields: ['result'] },
    { fields: ['createdAt'] },
  ],
});

export default VerificationLog;
