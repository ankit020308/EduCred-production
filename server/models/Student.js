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
        references: {
            model: 'User',
            key: 'id'
        }
    }
}, {
    indexes: [
        { fields: ['userId'] }
    ]
});

export default Student;
