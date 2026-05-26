import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtpRecord = sequelize.define('OtpRecord', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    otpHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    lastResend: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    indexes: [
        { unique: true, fields: ['email'] }
    ]
});

export default OtpRecord;
