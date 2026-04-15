import rateLimit from 'express-rate-limit';

/**
 * 🔒 Authentication Rate Limiter
 * Prevents brute-force attacks on sensitive endpoints.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for dev resilience
    message: {
        error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    },
    standardHeaders: true, 
    legacyHeaders: false, 
});

/**
 * 📧 OTP Request Limiter
 * Specifically targets email/phone verification to prevent spam.
 */
export const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit to 5 OTP requests per hour
    message: {
        error: 'Maximum OTP attempts reached. Please wait an hour before requesting a new code.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
