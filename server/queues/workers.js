import Queue from 'bull';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Registry from '../services/registryService.js';
import { generateStructuralHash } from '../utils/hashing.js';
import { issueCertificateOnChain } from '../utils/blockchain.js';
import { uploadFileToPinata, uploadJSONToPinata, isPinataConfigured } from '../utils/ipfsService.js';
import { generateCertificatePDF } from '../utils/pdfService.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const certificateQueue = new Queue('certificate-issuance', redisUrl);

const CERTIFICATE_TYPE_CODES = {
    'Degree Certificate': 0,
    'Provisional Certificate': 1,
    'Consolidated Marks Sheet': 2,
    'Migration Certificate': 3,
    'Transfer Certificate': 4,
    'Character Certificate': 5,
};

async function saveFileLocally(buffer, filename) {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/uploads/${filename}`;
}

certificateQueue.process(async (job, done) => {
    try {
        const {
            certDbId,
            studentData,
            universityData
        } = job.data;

        console.log(`[WORKER] Processing certificate issuance for: ${certDbId}`);

        // 1. Structural Hash Generation
        const structuralHash = generateStructuralHash({
            studentName: studentData.studentName,
            course: studentData.course,
            issuerId: universityData.id
        });

        // 2. Certificate PDF Generation with embedded hash
        const fileBuffer = await generateCertificatePDF({
            universityName: universityData.name,
            studentName: studentData.studentName,
            programName: studentData.course,
            branch: studentData.branch || 'General',
            cgpa: studentData.cgpa || '',
            city: universityData.city || 'India',
            graduationYear: studentData.graduationYear || new Date().getFullYear(),
            certificateId: studentData.certificateId,
            qrPayload: JSON.stringify({ id: studentData.certificateId, hash: structuralHash })
        });

        let fileUrl;
        let ipfsCid = null;
        const filename = `CERT_${studentData.certificateId}_${Date.now()}.pdf`;

        // 3. Storage
        if (isPinataConfigured()) {
            try {
                const ipfsResult = await uploadFileToPinata(fileBuffer, filename, {
                    certificateId: studentData.certificateId,
                    studentName: studentData.studentName,
                    issuer: universityData.name
                });
                ipfsCid = ipfsResult.cid;
                fileUrl = ipfsResult.url;
                
                // Store metadata to IPFS
                const metaResult = await uploadJSONToPinata({
                    ...studentData,
                    certificateHash: structuralHash
                }, `META_${studentData.certificateId}`);
                
            } catch (ipfsErr) {
                console.error("[WORKER] IPFS upload failed:", ipfsErr.message);
                fileUrl = await saveFileLocally(fileBuffer, filename);
            }
        } else {
            fileUrl = await saveFileLocally(fileBuffer, filename);
        }

        // 4. Update Database to link file early
        await Registry.update('certificates', { id: certDbId }, {
            fileUrl,
            ipfsCid,
            certificateHash: structuralHash
        });

        // 5. Blockchain Anchor using University Wallet!
        const receipt = await issueCertificateOnChain(
            certDbId.toString(),
            structuralHash,
            CERTIFICATE_TYPE_CODES[studentData.certificateType] ?? 0,
            universityData.encryptedPrivateKey
        );

        // 6. DB finalization
        await Registry.update('certificates', { id: certDbId }, {
            blockchainTxHash: receipt.hash,
            status: 'CONFIRMED',
            workflowStatus: 'ISSUED'
        });

        await Registry.insert('ledger', {
            type: 'ISSUE',
            studentName: studentData.studentName,
            universityName: universityData.name,
            certificateId: certDbId,
            txHash: receipt.hash,
            status: 'SUCCESS',
            metadata: { certificateType: studentData.certificateType }
        });

        done(null, { hash: structuralHash, txHash: receipt.hash, url: fileUrl });
    } catch (error) {
        console.error("[WORKER] Issuance failed:", error);
        if (job.data.certDbId) {
            await Registry.update('certificates', { id: job.data.certDbId }, { status: 'FAILED' });
        }
        done(error);
    }
});

export default certificateQueue;
