import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UPLOAD_MAX_BYTES, CSV_MAX_BYTES } from '../constants/limits.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temporary uploads directory exists
const UPLOAD_TEMP_DIR = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
    fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_TEMP_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
]);

export const upload = multer({
    storage,
    limits: {
        fileSize: UPLOAD_MAX_BYTES,
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(new Error('Only PDF, PNG, and JPEG certificate files are allowed.'));
            return;
        }
        cb(null, true);
    }
});

const CSV_MIME_TYPES = new Set([
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel',
]);

export const csvUpload = multer({
    storage,
    limits: { fileSize: CSV_MAX_BYTES },
    fileFilter: (req, file, cb) => {
        if (CSV_MIME_TYPES.has(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed for batch issuance.'));
        }
    },
});
