import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Request = sequelize.define('Request', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  universityId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  transcriptData: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
}, {
  indexes: [
    { fields: ['studentId'] },
    { fields: ['universityId'] },
    { fields: ['status'] },
  ],
});

export default Request;
