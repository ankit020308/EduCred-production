// server/controllers/studentController.js
import Registry from '../services/registryService.js';
import { Op } from 'sequelize';

const isProd = process.env.NODE_ENV === 'production';
const serverErr = (res, err, msg = 'Operation failed.') => {
  console.error('[STUDENT]', err);
  res.status(500).json({ error: msg, ...(isProd ? {} : { details: err.message }) });
};

export const getStudentCertificates = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const student = await Registry.findOne('students', { userId: req.user.id });

    const certs = await Registry.find('certificates', {
      [Op.or]: [
        student ? { studentId: student.id } : null,
        { studentEmail: req.user.email }
      ].filter(Boolean)
    });

    res.json(certs);
  } catch (error) {
    serverErr(res, error, 'Failed to fetch certificates.');
  }
};

export const getStudentCertificateById = async (req, res) => {
  try {
    const student = await Registry.findOne('students', { userId: req.user.id });
    const cert = await Registry.findOne('certificates', {
      id: req.params.id,
      $or: [
        student ? { studentId: student.id } : null,
        { studentEmail: req.user.email }
      ].filter(Boolean)
    });

    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    res.json(cert);
  } catch (error) {
    serverErr(res, error, 'Failed to fetch certificate.');
  }
};

export const getStudentStats = async (req, res) => {
  try {
    const total = await Registry.count('certificates', { studentEmail: req.user.email });
    res.json({ total });
  } catch (error) {
    serverErr(res, error, 'Failed to fetch student stats.');
  }
};

export const connectDigilocker = async (req, res) => {
  try {
    const { accessToken, refreshToken, username } = req.body;

    const student = await Registry.findOne('students', { userId: req.user.id });
    if (!student) return res.status(404).json({ error: 'Student record not found' });

    await Registry.update('students', { userId: req.user.id }, {
      digilockerAccessToken: accessToken,
      digilockerRefreshToken: refreshToken,
      digilockerConnected: true,
      digilockerUsername: username || 'Linked User'
    });

    const updatedStudent = await Registry.findOne('students', { userId: req.user.id });
    res.json({ message: 'DigiLocker connected successfully', student: updatedStudent });
  } catch (error) {
    serverErr(res, error, 'Failed to connect DigiLocker.');
  }
};

export const disconnectDigilocker = async (req, res) => {
  try {
    const student = await Registry.findOne('students', { userId: req.user.id });
    if (!student) return res.status(404).json({ error: 'Student record not found' });

    await Registry.update('students', { userId: req.user.id }, {
      digilockerAccessToken: null,
      digilockerRefreshToken: null,
      digilockerConnected: false,
      digilockerUsername: null
    });

    res.json({ message: 'DigiLocker disconnected successfully' });
  } catch (error) {
    serverErr(res, error, 'Failed to disconnect DigiLocker.');
  }
};
