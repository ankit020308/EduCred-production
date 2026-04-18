/**
 * Queue subsystem is intentionally disabled in this deployment profile.
 * Callers must fail loudly instead of pretending work was queued.
 */
export const certificateQueue = {
    on: () => {
        throw new Error('Certificate queue is unavailable.');
    },
    add: () => {
        throw new Error('Certificate queue is unavailable.');
    },
    getJob: () => {
        throw new Error('Certificate queue is unavailable.');
    }
};

export const enqueueCertificateJob = async () => {
    throw new Error('Certificate queue is unavailable.');
};
