import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

/**
 * 📂 Cloud Storage Node: Cloudinary
 * Provides a highly available, redundant storage layer for academic credentials.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

export const uploadCloud = multer({ storage: storage });

export { cloudinary };
export default cloudinary;
