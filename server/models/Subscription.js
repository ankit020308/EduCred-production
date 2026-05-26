import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { PLANS, DEFAULT_PLAN } from '../constants/plans.js';

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  universityId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'Universities', key: 'id' },
  },
  plan: {
    type: DataTypes.ENUM(...Object.keys(PLANS)),
    defaultValue: DEFAULT_PLAN,
    allowNull: false,
  },
  // How many certificates issued in the current billing period
  issuancesUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  // Cached limit for the current plan (-1 = unlimited)
  issuanceLimit: {
    type: DataTypes.INTEGER,
    defaultValue: PLANS[DEFAULT_PLAN].issuanceLimit,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired', 'trialing'),
    defaultValue: 'active',
    allowNull: false,
  },
  razorpaySubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  razorpayCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  currentPeriodStart: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  indexes: [
    { unique: true, fields: ['universityId'] },
    { fields: ['razorpaySubscriptionId'] },
  ],
});

export default Subscription;
