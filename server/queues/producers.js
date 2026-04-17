import Queue from 'bull';
import dotenv from 'dotenv';
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const certificateQueue = new Queue('certificate-issuance', redisUrl);

export async function enqueueCertificateJob(jobData) {
    // Add job to the Bull queue
    const job = await certificateQueue.add(jobData, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    });
    return job;
}
