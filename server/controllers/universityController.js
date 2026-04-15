// server/controllers/universityController.js
import Registry from '../services/registryService.js';

/**
 * 🎓 University Controller (Administrative Protocol)
 * Handles institutional verification and node status management.
 */

/**
 * Get all pending university applications (Admin Only)
 */
export const getPendingUniversities = async (req, res) => {
  try {
    const pending = await Registry.find('universities', { status: 'PENDING' });
    res.json({ data: pending });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending applications.' });
  }
};

/**
 * Get all universities (Admin Only)
 */
export const getAllUniversities = async (req, res) => {
    try {
      const universities = await Registry.find('universities');
      res.json({ data: universities });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch universities.' });
    }
  };

/**
 * Approve a university application (Admin Only)
 */
export const approveUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const university = await Registry.findById('universities', id);

    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    await Registry.update('universities', { id }, {
        status: 'APPROVED',
        isVerified: true,
        approvedBy: req.user.id,
        approvedAt: new Date()
    });

    res.json({ message: 'University approved successfully.', data: university });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed.', details: err.message });
  }
};

/**
 * Reject a university application (Admin Only)
 */
export const rejectUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const university = await Registry.findById('universities', id);

    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    await Registry.update('universities', { id }, {
        status: 'REJECTED',
        isVerified: false
    });

    res.json({ message: 'University application rejected.', data: university });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed.' });
  }
};
