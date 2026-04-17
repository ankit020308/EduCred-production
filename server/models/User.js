// server/models/User.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * 👤 Identity Node Model
 * Represents the primary authentication and role-based access layer.
 */
const User = sequelize.define('User', {
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
        unique: true,
        validate: { isEmail: true }
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('pending', 'student', 'university', 'admin', 'super_admin', 'verifier'),
        defaultValue: 'pending'
    },
    universityName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isPhoneVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isGoogleUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: true
    },
    otpExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    otpAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    lastOtpResend: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isSuperAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['role'] }
    ]
});

export default User;
