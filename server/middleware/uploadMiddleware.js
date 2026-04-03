import multer from 'multer';
import { cloudinary } from '../utils/cloudinary.js';
import streamifier from 'streamifier';

// 📂 PRODUCTION CONFIG: Multer Memory Storage
// Serverless environments (Vercel/Lambda) cannot write to local disk.
// We keep the file in a temporary buffer for hashing and immediate streaming.
const storage = multer.memoryStorage();

export const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

/**
 * ⚡ CLOUD STREAMER: Buffer-to-Cloudinary
 * Directly streams the file from memory to the cloud without local persistence.
 * @param {Buffer} buffer - File buffer from req.file
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const streamToCloudinary = (buffer, folder = 'educred_certificates') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { 
                folder,
                resource_type: 'auto',
                access_mode: 'public'
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};
