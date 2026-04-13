import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';
import VerificationLog from '../models/VerificationLog.js';

export const getStudentCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ 
      $or: [
        { studentId: req.user._id },
        { studentEmail: req.user.email } 
      ]
    }).populate('universityId', 'name shortName logoUrl isVerified status');
    
    res.json(certs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStudentCertificateById = async (req, res) => {
  try {
    const cert = await Certificate.findOne({
      _id: req.params.id,
      $or: [
        { studentId: req.user._id },
        { studentEmail: req.user.email }
      ]
    }).populate('universityId', 'name shortName logoUrl isVerified status');
    
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    
    res.json(cert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStudentStats = async (req, res) => {
  try {
    const total = await Certificate.countDocuments({ studentEmail: req.user.email });
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const connectDigilocker = async (req, res) => {
  try {
    // This expects the frontend to have done the OAuth flow and exchanged the code for tokens,
    // or the backend finishes the flow here. For this implementation, we assume frontend sends the code
    // and backend exchanges, OR frontend sends the access token directly from sandbox flow.
    const { accessToken, refreshToken, username } = req.body;
    
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ error: 'Student record not found' });
    
    student.digilockerAccessToken = accessToken; // In prod, encrypt this
    student.digilockerRefreshToken = refreshToken; 
    student.digilockerConnected = true;
    student.digilockerUsername = username || 'Linked User';
    
    await student.save();
    
    res.json({ message: 'DigiLocker connected successfully', student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const disconnectDigilocker = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ error: 'Student record not found' });
    
    student.digilockerAccessToken = undefined;
    student.digilockerRefreshToken = undefined;
    student.digilockerConnected = false;
    student.digilockerUsername = undefined;
    
    await student.save();
    
    res.json({ message: 'DigiLocker disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
