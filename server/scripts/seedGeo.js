import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import UniversityGeo from '../models/UniversityGeo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedData = [
  { name: "MIT Academy", lat: 18.5204, lng: 73.8567, city: "Pune", state: "Maharashtra", isActive: true },
  { name: "Stanford Online", lat: 37.4275, lng: -122.1697, city: "Stanford", state: "California", isActive: true },
  { name: "Oxford Tech", lat: 51.7520, lng: -1.2577, city: "Oxford", state: "Oxfordshire", isActive: true },
  { name: "NUS Engineering", lat: 1.3521, lng: 103.8198, city: "Singapore", state: "Singapore", isActive: true },
  { name: "IIT Bombay", lat: 19.1334, lng: 72.9133, city: "Mumbai", state: "Maharashtra", isActive: true, type: "IIT" }
];

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
};

const importData = async () => {
    try {
        await connectDB();
        await UniversityGeo.deleteMany();
        await UniversityGeo.insertMany(seedData);
        console.log('GeoData Imported!');
        process.exit(0);
    } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1);
    }
};

importData();
