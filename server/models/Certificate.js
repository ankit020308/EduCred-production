// server/models/Certificate.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * 📜 Certificate Model
 * Represents an anchored digital credential.
 */
const Certificate = sequelize.define('Certificate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    certificateId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    studentName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    studentEmail: {
        type: DataTypes.STRING,
        allowNull: false
    },
    studentPhone: {
        type: DataTypes.STRING,
        defaultValue: '0000000000'
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Student',
            key: 'id'
        }
    },
    course: {
        type: DataTypes.STRING,
        allowNull: false
    },
    issuer: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ipfsCid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metadataIpfsCid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    certificateHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    blockchainTxHash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'REVOKED'),
        defaultValue: 'PENDING'
    },
    workflowStatus: {
        type: DataTypes.ENUM('STAGE1', 'STAGE2', 'ISSUED'),
        defaultValue: 'STAGE1'
    },
    isRevoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    issuedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    universityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'University',
            key: 'id'
        }
    },
    certificateType: {
        type: DataTypes.STRING,
        defaultValue: 'Degree Certificate'
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    workflowLog: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    indexes: [
        { unique: true, fields: ['certificateId'] },
        { unique: true, fields: ['certificateHash'] },
        { fields: ['studentEmail'] },
        { fields: ['universityId'] },
        { fields: ['status'] }
    ]
});

export default Certificate;
