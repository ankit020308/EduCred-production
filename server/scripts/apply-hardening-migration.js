import '../utils/envLoader.js';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const queryInterface = sequelize.getQueryInterface();

async function tableExists(tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    if (error?.original?.code === '42P01' || /does not exist/i.test(error.message)) {
      return false;
    }
    throw error;
  }
}

async function ensureTable(tableName, columns) {
  if (await tableExists(tableName)) {
    console.log(`[migration] [SKIP] Table already exists: ${tableName}`);
    return;
  }

  await queryInterface.createTable(tableName, columns);
  console.log(`[migration] [SUCCESS] Created table: ${tableName}`);
}

async function ensureIndex(tableName, indexName, fields, options = {}) {
  const indexes = await queryInterface.showIndex(tableName);
  const alreadyExists = indexes.some((index) => index.name === indexName);

  if (alreadyExists) {
    console.log(`[migration] [SKIP] Index already exists: ${indexName} on ${tableName}`);
    return;
  }

  await queryInterface.addIndex(tableName, fields, { name: indexName, ...options });
  console.log(`[migration] [SUCCESS] Created index: ${indexName} on ${tableName}`);
}

async function changeColumnIfTableExists(tableName, columnName, columnDefinition) {
  if (!(await tableExists(tableName))) {
    console.log(`[migration] [SKIP] Table missing for column change: ${tableName}`);
    return;
  }

  await queryInterface.changeColumn(tableName, columnName, columnDefinition);
  console.log(`[migration] [SUCCESS] Ensured ${tableName}.${columnName} column definition`);
}

async function run() {
  console.log('\n--- 🛠️  EduCred Master Hardening Migration ---');
  console.log('--- Initializing secure schema protocol ---\n');

  await sequelize.authenticate();
  console.log('[migration] [SUCCESS] Database connection verified.\n');

  await ensureTable('Request', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    universityId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    transcriptData: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  await ensureTable('FraudAlert', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    alertType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    severity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    context: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    isReviewed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  await ensureTable('VerificationLog', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    certificateId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verificationMethod: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    result: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    verifierIp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    submittedHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // ─── Extend Certificate status enum with workflow values ──────────────────
  // ALTER TYPE ... ADD VALUE cannot run inside a transaction, which is fine
  // because IF NOT EXISTS makes it idempotent across redeploys.
  const newStatusValues = ['PENDING_REVIEW', 'ANCHOR_FAILED', 'ANCHOR_PENDING_FUNDS', 'REJECTED'];
  for (const val of newStatusValues) {
    try {
      await sequelize.query(
        `ALTER TYPE "enum_Certificate_status" ADD VALUE IF NOT EXISTS '${val}';`
      );
      console.log(`[migration] [SUCCESS] enum_Certificate_status: added '${val}'`);
    } catch (err) {
      // Postgres < 9.6 doesn't support IF NOT EXISTS — skip silently if value already exists
      if (/already exists/.test(err.message)) {
        console.log(`[migration] [SKIP] enum_Certificate_status: '${val}' already present`);
      } else {
        throw err;
      }
    }
  }

  // Add pdfHash column if missing (idempotent via try/catch)
  try {
    await queryInterface.addColumn('Certificate', 'pdfHash', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    console.log('[migration] [SUCCESS] Certificate.pdfHash column added');
  } catch (err) {
    if (/already exists/i.test(err.message) || /duplicate column/i.test(err.message)) {
      console.log('[migration] [SKIP] Certificate.pdfHash already exists');
    } else {
      throw err;
    }
  }

  for (const [columnName, columnDefinition] of Object.entries({
    reviewedBy: { type: DataTypes.STRING, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
  })) {
    try {
      await queryInterface.addColumn('Certificate', columnName, columnDefinition);
      console.log(`[migration] [SUCCESS] Certificate.${columnName} column added`);
    } catch (err) {
      if (/already exists/i.test(err.message) || /duplicate column/i.test(err.message)) {
        console.log(`[migration] [SKIP] Certificate.${columnName} already exists`);
      } else {
        throw err;
      }
    }
  }

  await ensureIndex('Certificate', 'certificate_certificateId_unique_idx', ['certificateId'], { unique: true });
  await ensureIndex('Certificate', 'certificate_certificateHash_unique_idx', ['certificateHash'], { unique: true });
  await ensureIndex('University', 'university_userId_unique_idx', ['userId'], { unique: true });
  await ensureIndex('Student', 'student_userId_unique_idx', ['userId'], { unique: true });
  await ensureIndex('Request', 'request_studentId_idx', ['studentId']);
  await ensureIndex('Request', 'request_universityId_idx', ['universityId']);
  await ensureIndex('Request', 'request_status_idx', ['status']);
  await ensureIndex('FraudAlert', 'fraud_alert_severity_idx', ['severity']);
  await ensureIndex('FraudAlert', 'fraud_alert_isReviewed_idx', ['isReviewed']);
  await ensureIndex('VerificationLog', 'verification_log_certificateId_idx', ['certificateId']);
  await ensureIndex('VerificationLog', 'verification_log_result_idx', ['result']);
  await ensureIndex('blacklistedTokens', 'blacklistedtokens_expiresat_idx', ['expiresAt']);
  await ensureIndex('AuditLog', 'auditlog_userid_createdat_idx', ['userId', 'createdAt']);
  await ensureIndex('Certificate', 'certs_studentemail_idx', ['studentEmail']);

  await changeColumnIfTableExists('ApiKey', 'keyPrefix', {
    type: DataTypes.STRING(32),
    allowNull: false,
  });

  // Partial index — only active keys need fast ownerId lookups (M-10)
  await ensureIndex('ApiKey', 'apikeys_ownerid_active_idx', ['ownerId'], {
    where: { isActive: true },
  });

  // GIN index on Certificate.metadata (JSONB) for fast JSON path queries
  const certIndexes = await queryInterface.showIndex('Certificate');
  const hasGin = certIndexes.some((idx) => idx.name === 'certificate_metadata_gin_idx');
  if (!hasGin) {
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS certificate_metadata_gin_idx ON "Certificate" USING GIN (metadata);'
    );
    console.log('[migration] [SUCCESS] Created GIN index: certificate_metadata_gin_idx');
  } else {
    console.log('[migration] [SKIP] GIN index already exists: certificate_metadata_gin_idx');
  }

  console.log('\n[migration] [SUCCESS] Hardening schema checks completed successfully.');
}

run()
  .catch((error) => {
    console.error('[migration] [ERROR] Hardening migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
