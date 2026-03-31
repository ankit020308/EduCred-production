import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import University from '../models/University.js';
import Student from '../models/Student.js';

const JWT_SECRET = process.env.JWT_SECRET || 'educred_dev_secret_2026';
const JWT_EXPIRES = '7d';

const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

export const register = async (req, res) => {
  try {
    const { name, email, password, role, universityName } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All primary fields are required.' });
    }
    if (!['student', 'university'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or university.' });
    }

    if (role === 'university' && !universityName) {
      return res.status(400).json({ error: 'University name is required for university accounts.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({ 
      name, 
      email, 
      passwordHash: password, 
      role, 
      universityName: role === 'university' ? universityName : undefined 
    });

    if (role === 'university') {
      await University.create({ name: universityName, email, userId: user._id });
    } else {
      await Student.create({ name, userId: user._id }); // Create empty student profile
    }

    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, universityName: user.universityName },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, universityName: user.universityName },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.', details: err.message });
  }
};

export const getMe = (req, res) => {
  const u = req.user;
  res.json({ id: u._id, name: u.name, email: u.email, role: u.role, universityName: u.universityName });
};
