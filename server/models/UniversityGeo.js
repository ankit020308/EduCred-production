import mongoose from 'mongoose';

const UniversityGeoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  shortName: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  lat: {
    type: Number,
  },
  lng: {
    type: Number,
  },
  type: {
    type: String,
    enum: ['IIT', 'NIT', 'IIM', 'Central', 'State', 'Deemed', 'Private'],
  },
  ugcId: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  totalCertificatesIssued: {
    type: Number,
    default: 0,
  },
  logoUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('UniversityGeo', UniversityGeoSchema);
