// server/models/University.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * 🎓 University Model
 * Represents verified institutions with the authority to issue credentials.
 */
const University = sequelize.define('University', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    documents: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isFlagged: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        defaultValue: 'PENDING'
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    publicWalletAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    encryptedPrivateKey: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    indexes: [
        { unique: true, fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['publicWalletAddress'] }
    ]
});

export default University;
