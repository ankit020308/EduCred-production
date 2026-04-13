import University from '../models/University.js';
import User from '../models/User.js';

/**
 * Get all pending university applications (Admin Only)
 */
export const getPendingUniversities = async (req, res) => {
  try {
    const pending = await University.find({ status: 'PENDING' })
      .select('name email documents description isFlagged createdAt')
      .sort({ createdAt: -1 });
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
      const universities = await University.find()
        .select('name email status isVerified isFlagged description documents createdAt')
        .sort({ createdAt: -1 });
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
    const university = await University.findById(id);

    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    university.status = 'APPROVED';
    university.isVerified = true;
    university.approvedBy = req.user._id;
    university.approvedAt = new Date();

    await university.save();

    // Optionally update the associated user record if needed
    // const user = await User.findById(university.userId);
    // ...

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
    const university = await University.findById(id);

    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    university.status = 'REJECTED';
    university.isVerified = false;
    await university.save();

    res.json({ message: 'University application rejected.', data: university });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed.' });
  }
};
