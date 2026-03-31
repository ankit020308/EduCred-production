import mongoose from 'mongoose';
import crypto from 'crypto';
import Certificate from '../models/Certificate.js';
import User from '../models/User.js';

// No dotenv in this simplistic seed script for now, 
// using the same connection logic as the main server
const MONGO_URI = 'mongodb://localhost:27017/educred';

const students = [
  { name: 'Aarav Sharma', reg: '20BCS001', branch: 'Computer Science', year: 2024 },
  { name: 'Isha Patel', reg: '20BIT012', branch: 'Information Technology', year: 2024 },
  { name: 'Rohan Gupta', reg: '20BME045', branch: 'Mechanical Engineering', year: 2024 },
  { name: 'Ananya Iyer', reg: '20BEC089', branch: 'Electronics', year: 2024 },
  { name: 'Vikram Singh', reg: '20BCE033', branch: 'Civil Engineering', year: 2024 },
  { name: 'Sanya Malhotra', reg: '20BCS056', branch: 'Computer Science', year: 2024 },
  { name: 'Kabir Verma', reg: '20BIT099', branch: 'Information Technology', year: 2024 },
  { name: 'Megha Reddy', reg: '20BEC112', branch: 'Electronics', year: 2024 },
  { name: 'Arjun Das', reg: '20BME019', branch: 'Mechanical Engineering', year: 2024 },
  { name: 'Pooja Nair', reg: '20BCH007', branch: 'Chemical Engineering', year: 2024 },
];

const subjects_pool = [
  { name: 'Data Structures', weight: 'Computer' },
  { name: 'Algorithms', weight: 'Computer' },
  { name: 'Thermodynamics', weight: 'Core' },
  { name: 'Digital Logic', weight: 'Electronics' },
  { name: 'Operating Systems', weight: 'Computer' },
  { name: 'Fluid Mechanics', weight: 'Core' },
  { name: 'Calculus', weight: 'Math' },
  { name: 'Discrete Math', weight: 'Math' },
  { name: 'Networks', weight: 'Computer' },
  { name: 'Database Management', weight: 'Computer' },
];

function buildHashPayload(data, selectedFields = ['core', 'cgpa', 'semesters']) {
  const payload = {
    degreeName:     data.degreeName,
    graduationYear: Number(data.graduationYear),
    studentName:    data.studentName,
    universityName: data.universityName,
    regNo:          data.regNo,
  };
  if (data.cgpa != null) payload.cgpa = data.cgpa;
  if (Array.isArray(data.semesters)) {
    payload.semesters = data.semesters.map(sem => ({
      semesterNumber: sem.semesterNumber,
      sgpa: sem.sgpa,
      subjects: sem.subjects.map(s => ({
        grade: s.grade,
        marks: s.marks,
        name: s.name
      })).sort((a, b) => a.name.localeCompare(b.name))
    })).sort((a,b) => a.semesterNumber - b.semesterNumber);
  }
  return JSON.stringify(payload, Object.keys(payload).sort());
}

async function runSeed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@educred.com' });
    if (!admin) {
        console.log('Admin user not found. Please run the server first.');
        process.exit(1);
    }

    await Certificate.deleteMany({});
    console.log('Certs cleared');

    for (const s of students) {
      const semesters = [1, 2, 3, 4].map(num => ({
        semesterNumber: num,
        sgpa: parseFloat((Math.random() * (10 - 7) + 7).toFixed(2)),
        subjects: Array.from({ length: 5 }, (_, i) => ({
          name: subjects_pool[Math.floor(Math.random() * subjects_pool.length)].name,
          marks: Math.floor(Math.random() * (100 - 60) + 60),
          grade: 'A'
        }))
      }));

      const certData = {
        studentName: s.name,
        regNo: s.reg,
        universityName: 'EduCred University',
        degreeName: 'Bachelor of Technology',
        graduationYear: s.year,
        branch: s.branch,
        cgpa: parseFloat((semesters.reduce((acc, curr) => acc + curr.sgpa, 0) / 4).toFixed(2)),
        semesters: semesters,
        courseType: 'Full-Time',
        status: 'MINED',
        issuedBy: admin._id,
        branding: { color: '#3B82F6' },
        selectedFields: ['core', 'cgpa', 'semesters']
      };

      const hashPayload = buildHashPayload(certData);
      const certificateHash = crypto.createHash('sha256').update(hashPayload).digest('hex');
      
      await Certificate.create({
        ...certData,
        hashPayload,
        certificateHash,
        transactionHash: '0x' + crypto.randomBytes(32).toString('hex'),
        qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 
      });
      console.log(`Seeded: ${s.name}`);
    }

    console.log('✅ 10 Students Seeded Successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

runSeed();
