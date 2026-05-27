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
    profileImageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isLocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isSuperAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Incremented on erasure/force-logout to invalidate all outstanding JWTs.
    // Embedded as `tv` in every access token; middleware rejects mismatches.
    tokenVersion: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    // DPDPA 2023 — explicit consent capture
    consentGiven: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    consentGivenAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // DPDPA — soft-delete: PII wiped, anonymised audit trail preserved
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['role'] }
    ],
    // paranoid: false — we handle deletion manually to control what's wiped
});

export default User;
