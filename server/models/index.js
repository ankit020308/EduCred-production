// server/models/index.js
import User from './User.js';
import University from './University.js';
import Student from './Student.js';
import Certificate from './Certificate.js';
import AuditLog from './AuditLog.js';
import Ledger from './Ledger.js';
import BlacklistedToken from './BlacklistedToken.js';
import Request from './Request.js';
import FraudAlert from './FraudAlert.js';
import VerificationLog from './VerificationLog.js';
import OtpRecord from './OtpRecord.js';
import Subscription from './Subscription.js';
import ApiKey from './ApiKey.js';

// ─── Associations ─────────────────────────────────────────────────────────────

// User <-> University
User.hasOne(University, { foreignKey: 'userId', as: 'universityProfile' });
University.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Student
User.hasOne(Student, { foreignKey: 'userId', as: 'studentProfile' });
Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// University <-> Certificate
University.hasMany(Certificate, { foreignKey: 'universityId', as: 'issuedCertificates' });
Certificate.belongsTo(University, { foreignKey: 'universityId', as: 'institution' });

// Student <-> Certificate
Student.hasMany(Certificate, { foreignKey: 'studentId' });
Certificate.belongsTo(Student, { foreignKey: 'studentId' });

// User <-> Certificate (Issued By)
User.hasMany(Certificate, { foreignKey: 'issuedBy' });
Certificate.belongsTo(User, { foreignKey: 'issuedBy', as: 'issuingAdmin' });

// User <-> AuditLog
User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// Certificate <-> Ledger
Certificate.hasMany(Ledger, { foreignKey: 'certificateId' });
Ledger.belongsTo(Certificate, { foreignKey: 'certificateId' });

// University <-> Subscription (1:1 billing record)
University.hasOne(Subscription, { foreignKey: 'universityId', as: 'subscription' });
Subscription.belongsTo(University, { foreignKey: 'universityId' });

// User <-> ApiKey (one user can have many API keys)
User.hasMany(ApiKey, { foreignKey: 'ownerId', as: 'apiKeys' });
ApiKey.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

export {
    User,
    University,
    Student,
    Certificate,
    AuditLog,
    Ledger,
    BlacklistedToken,
    Request,
    FraudAlert,
    VerificationLog,
    OtpRecord,
    Subscription,
    ApiKey,
};
