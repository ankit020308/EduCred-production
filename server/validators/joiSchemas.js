import Joi from 'joi';

/**
 * 🔒 EduCred Standardized Validation Schemas
 * Centralizing logic to ensure node-wide consistency.
 */

export const certificateIssuanceSchema = Joi.object({
  // Frontend contract fields
  studentName: Joi.string().required().min(1).max(100),
  email: Joi.string().email().required(),
  rollNumber: Joi.string().required(),
  program: Joi.string().required(),
  branch: Joi.string().required(),
  finalCGPA: Joi.number().required(),

  // Structured academic record — at least one semester required
  semesters: Joi.array().items(
    Joi.object({
      semester: Joi.number().integer().min(1).required(),
      subjects: Joi.array().items(
        Joi.object({
          code: Joi.string().required(),
          marks: Joi.number().required(),
        })
      ).min(1).required(),
      sgpa: Joi.number().required(),
    })
  ).min(1).required(),
});

export const requestFulfillmentSchema = Joi.object({
  studentId: Joi.string().optional(),
  universityId: Joi.string().required(),
  transcriptData: Joi.object({
    regNo: Joi.string().optional(),
    degree: Joi.string().optional(),
    branch: Joi.string().optional(),
    name: Joi.string().optional(),
    cgpa: Joi.string().optional(),
    semesters: Joi.array().items(Joi.object()).optional(),
  }).required(),
});

export const universityApprovalSchema = Joi.object({
  universityId: Joi.string().required(),
  notes: Joi.string().optional().allow('', null),
});

/**
 * 🔑 Identity & Auth Schemas
 * Enforcing strict complexity and role-based validation.
 */

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    'string.min': 'Password must be at least 8 characters long.'
  });

export const registrationSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  email: Joi.string().email().required(),
  password: passwordSchema,
  role: Joi.string().valid('university', 'student').default('student'),
  universityName: Joi.string().when('role', {
    is: 'university',
    then: Joi.required(),
    otherwise: Joi.optional().allow('', null)
  }),
  description: Joi.string().optional().allow('', null),
  documents: Joi.array().items(Joi.string()).optional(),
  officialDomain: Joi.string().optional().allow('', null),
  adminName: Joi.string().optional().allow('', null),
  // legacy alias — keep both so old clients don't break
  adminContactName: Joi.string().optional().allow('', null)
});


export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const onboardingSchema = Joi.object({
  role: Joi.string().valid('student', 'university').required(),
  universityName: Joi.string().when('role', {
    is: 'university',
    then: Joi.required(),
    otherwise: Joi.optional().allow('', null)
  }),
  description: Joi.string().optional().allow('', null),
  name: Joi.string().optional().allow('', null), // Fallback support
  documents: Joi.array().items(Joi.string()).optional()
});
