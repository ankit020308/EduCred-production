import University from '../models/University.js';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import VerificationLog from '../models/VerificationLog.js';
import FraudAlert from '../models/FraudAlert.js';
import UniversityGeo from '../models/UniversityGeo.js';

export const getPendingUniversities = async (req, res) => {
  try {
    const pending = await University.find({ status: 'PENDING' });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveUniversity = async (req, res) => {
  try {
    const { universityId } = req.body;
    const university = await University.findById(universityId);
    if (!university) return res.status(404).json({ error: 'University not found' });
    
    university.status = 'APPROVED';
    university.approvedBy = req.user._id;
    university.approvedAt = new Date();
    await university.save();
    
    res.json({ message: 'University approved successfully', university });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectUniversity = async (req, res) => {
  try {
    const { universityId, reason } = req.body;
    const university = await University.findById(universityId);
    if (!university) return res.status(404).json({ error: 'University not found' });
    
    university.status = 'REJECTED';
    await university.save();
    
    res.json({ message: 'University rejected successfully', university });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUniversities = async (req, res) => {
  try {
    const universities = await University.find();
    res.json(universities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const suspendUniversity = async (req, res) => {
  try {
    const { universityId, reason } = req.body;
    const university = await University.findById(universityId);
    if (!university) return res.status(404).json({ error: 'University not found' });
    
    university.status = 'SUSPENDED';
    university.suspendedReason = reason;
    await university.save();
    
    res.json({ message: 'University suspended successfully', university });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const totalCertificates = await Certificate.countDocuments();
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const certificatesToday = await Certificate.countDocuments({ issuedAt: { $gte: startOfToday } });
    
    const totalVerifications = await VerificationLog.countDocuments();
    const verificationsToday = await VerificationLog.countDocuments({ timestamp: { $gte: startOfToday } });
    
    const unreviewedAlerts = await FraudAlert.countDocuments({ isReviewed: false });
    const approvedUniversities = await University.countDocuments({ status: 'APPROVED' });
    const pendingUniversities = await University.countDocuments({ status: 'PENDING' });
    
    res.json({
      totalCertificates,
      certificatesToday,
      totalVerifications,
      verificationsToday,
      unreviewedAlerts,
      approvedUniversities,
      pendingUniversities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFraudAlerts = async (req, res) => {
  try {
    const alerts = await FraudAlert.find().sort({ severity: -1, createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateFraudAlert = async (req, res) => {
  try {
    const { notes } = req.body;
    const alert = await FraudAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    
    alert.isReviewed = true;
    alert.reviewNotes = notes;
    alert.reviewedBy = req.user.name || req.user.email;
    alert.reviewedAt = new Date();
    await alert.save();
    
    res.json({ message: 'Alert updated', alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUniversitiesGeo = async (req, res) => {
  try {
    const geo = await UniversityGeo.find();
    res.json(geo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUniversityGeo = async (req, res) => {
  try {
    const { isActive } = req.body;
    const geo = await UniversityGeo.findById(req.params.id);
    if (!geo) return res.status(404).json({ error: 'Geo record not found' });
    
    if (isActive !== undefined) geo.isActive = isActive;
    await geo.save();
    
    res.json({ message: 'Geo record updated', geo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
