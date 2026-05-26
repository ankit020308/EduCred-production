// server/controllers/studentController.js
import Registry from '../services/registryService.js';
import { Op } from 'sequelize';
import crypto from 'crypto';
import {
  getDigilockerAuthUrl as buildDigilockerAuthUrl,
  exchangeDigilockerToken,
  getDigilockerUserProfile,
  getDigilockerDocuments as fetchDigilockerDocs
} from '../utils/digilockerService.js';
import { makeServerErr } from '../utils/httpError.js';

const serverErr = makeServerErr('[STUDENT]');

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
    const student = await Registry.findOne('students', { userId: req.user.id });
    const total = await Registry.count('certificates', { studentEmail: req.user.email });
    res.json({ total, student });
  } catch (error) {
    serverErr(res, error, 'Failed to fetch student stats.');
  }
};

export const getDigilockerAuthUrl = async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    // In a real app, store state in session/Redis to verify it in the callback
    const url = buildDigilockerAuthUrl(state);
    res.json({ url });
  } catch (error) {
    serverErr(res, error, 'Failed to generate DigiLocker Auth URL.');
  }
};

export const digilockerCallback = async (req, res) => {
  try {
    const { code } = req.body; // Assume frontend handles redirect and passes code to backend
    if (!code) return res.status(400).json({ error: 'Authorization code is required.' });

    const student = await Registry.findOne('students', { userId: req.user.id });
    if (!student) return res.status(404).json({ error: 'Student record not found.' });

    // 1. Exchange code for tokens
    const tokens = await exchangeDigilockerToken(code);
    
    // 2. Fetch user profile (KYC)
    const profile = await getDigilockerUserProfile(tokens.access_token);

    // 3. Update database
    await Registry.update('students', { userId: req.user.id }, {
      digilockerAccessToken: tokens.access_token,
      digilockerRefreshToken: tokens.refresh_token,
      digilockerConnected: true,
      digilockerUsername: profile.name || profile.username || 'Linked User'
    });

    const updatedStudent = await Registry.findOne('students', { userId: req.user.id });
    res.json({ message: 'DigiLocker connected successfully', student: updatedStudent });
  } catch (error) {
    serverErr(res, error, 'Failed to connect DigiLocker.');
  }
};

export const getDigilockerDocuments = async (req, res) => {
  try {
    const student = await Registry.findOne('students', { userId: req.user.id });
    if (!student || !student.digilockerConnected || !student.digilockerAccessToken) {
      return res.status(400).json({ error: 'DigiLocker is not connected.' });
    }

    const documents = await fetchDigilockerDocs(student.digilockerAccessToken);
    res.json({ documents });
  } catch (error) {
    serverErr(res, error, 'Failed to fetch DigiLocker documents.');
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
