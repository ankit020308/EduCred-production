import { logAudit } from '../utils/logger.js';
import Joi from 'joi';

const supportSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  message: Joi.string().required().min(10).max(2000),
});

/**
 * [SUPPORT] [CONTACT]
 * Handles institutional support inquiries and records them to the audit log.
 */
export const submitContactForm = async (req, res) => {
  try {
    const { error, value } = supportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { name, email, message } = value;

    // Record support inquiry in audit logs
    await logAudit(
      req,
      'SUPPORT_INQUIRY',
      'SUCCESS',
      `Message from ${name}: ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`,
      {
        name,
        email,
        fullMessage: message,
        submittedAt: new Date().toISOString(),
      }
    );

    res.status(200).json({
      success: true,
      message: 'Support inquiry received. Our team will contact you shortly.',
    });
  } catch (err) {
    console.error('[SUPPORT] [ERROR] Inbound support failure:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to submit inquiry. Please try again later.',
    });
  }
};
