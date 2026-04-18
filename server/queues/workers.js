/**
 * Queue workers are disabled in this deployment profile.
 */
export const startCertificateWorker = () => {
    throw new Error('Certificate worker is unavailable.');
};
