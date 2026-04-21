// server/models/Student.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * 👤 Student Model
 * Links user identities to credential histories.
 */
const Student = sequelize.define('Student', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
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
    regNo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    degree: {
        type: DataTypes.STRING,
        allowNull: true
    },
    branch: {
        type: DataTypes.STRING,
        allowNull: true
    },
    digilockerAccessToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    digilockerRefreshToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    digilockerConnected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    digilockerUsername: {
        type: DataTypes.STRING,
        allowNull: true
    },
    publicWalletAddress: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    indexes: [
        { unique: true, fields: ['userId'] }
    ]
});

export default Student;
