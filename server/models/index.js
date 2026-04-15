// server/models/index.js
import User from './User.js';
import University from './University.js';
import Student from './Student.js';
import Certificate from './Certificate.js';
import AuditLog from './AuditLog.js';
import Ledger from './Ledger.js';

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

export {
    User,
    University,
    Student,
    Certificate,
    AuditLog,
    Ledger
};
