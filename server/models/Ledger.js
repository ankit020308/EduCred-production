// server/models/Ledger.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * 🔗 Ledger Model
 * Stores an immutable record of public transaction events.
 */
const Ledger = sequelize.define('Ledger', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: DataTypes.ENUM('ISSUE', 'REVOKE', 'VERIFY', 'TRANSFER'),
        allowNull: false
    },
    studentName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    universityName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    certificateId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Certificate',
            key: 'id'
        }
    },
    txHash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSON,
        defaultValue: {}
    }
}, {
    indexes: [
        { fields: ['type'] },
        { fields: ['txHash'] },
        { fields: ['createdAt'] }
    ]
});

export default Ledger;
