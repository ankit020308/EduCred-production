// server/models/AuditLog.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * 🕵️ Audit Log Model
 * Tracks critical system events for compliance and security auditing.
 */
const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    detail: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
    }
}, {
    indexes: [
        { fields: ['userId'] },
        { fields: ['action'] },
        { fields: ['createdAt'] }
    ]
});

export default AuditLog;
