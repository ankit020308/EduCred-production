import mongoose from 'mongoose';
import User from './models/User.js';
import University from './models/University.js';
import dotenv from 'dotenv';

dotenv.config();

async function debug() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/educred';
  await mongoose.connect(uri);
  
  const users = await User.find({}, 'name email role');
  console.log('--- USERS ---');
  console.log(users);
  
  const unis = await University.find({}, 'name email status userId');
  console.log('--- UNIVERSITIES ---');
  console.log(unis);
  
  process.exit(0);
}

debug();
