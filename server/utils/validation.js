import Joi from 'joi';

/**
 * 🔒 Authentication Validation Logic
 * Ensures clean, malicious-free data ingress.
 */
export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
        'string.empty': 'Operational name is required.',
        'string.min': 'Name must be at least 2 characters long.'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'A valid institutional email is required.'
    }),
    password: Joi.string().min(8).required().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).messages({
        'string.min': 'Security key must be at least 8 characters.',
        'string.pattern.base': 'Password must only contain alphanumeric characters.'
    }),
    role: Joi.string().valid('student', 'university').required(),
    universityName: Joi.string().when('role', {
        is: 'university',
        then: Joi.required(),
        otherwise: Joi.optional()
    })
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

export const otpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
});
