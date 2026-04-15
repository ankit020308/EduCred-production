import Registry from '../services/registryService.js';

/**
 * Middleware to check if a university user is APPROVED.
 * Redirects or blocks sensitive actions (like issuance) if PENDING or REJECTED.
 */
export const requireApprovedUniversity = async (req, res, next) => {
  try {
    if (req.user.role !== 'university') {
      return next(); // Skip if not a university role (admins or students might have different paths)
    }

    const university = Registry.findOne('universities', { userId: req.user._id });

    if (!university) {
      return res.status(403).json({ 
        error: 'Institutional Identity Required.', 
        message: 'No university profile found for this user.' 
      });
    }

    if (university.status !== 'APPROVED') {
      return res.status(403).json({ 
        error: 'Verification Pending.', 
        message: `Your institutional node status is currently ${university.status}. 
                  Authentication requires manual trust approval by an admin.`,
        status: university.status
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Verification middleware failure.', details: err.message });
  }
};
