// server/controllers/systemController.js
import { logger } from '../utils/winstonLogger.js';
import Registry from '../services/registryService.js';
import { logAudit } from '../utils/auditLogger.js';
import { getBlockchainRuntimeInfo } from '../utils/blockchain.js';

/**
 * 🛰️ System Controller
 * Real-time monitoring and global protocol diagnostics.
 */

/**
 * @desc Get real-time global system statistics
 */
export const getSystemStats = async (req, res) => {
    try {
        const blockchainMode = getBlockchainRuntimeInfo().mode;
        const totalCertificates = await Registry.count('certificates');
        let credentialsSecured = totalCertificates.toString();
        
        if (totalCertificates >= 1000000) {
            credentialsSecured = (totalCertificates / 1000000).toFixed(1) + "M+";
        } else if (totalCertificates >= 1000) {
            credentialsSecured = (totalCertificates / 1000).toFixed(1) + "K+";
        } else {
            credentialsSecured = totalCertificates.toLocaleString();
        }

        const universityNodes = await Registry.count('universities', { status: 'APPROVED' });
        const activeNodes = universityNodes.toLocaleString();

        const serverUptimeSeconds = process.uptime();
        const networkUptime = `${(serverUptimeSeconds / 3600).toFixed(2)}h`;
        const avgBlockTime = blockchainMode === 'LIVE' ? 'external-chain' : 'not-available';

        res.status(200).json({
            success: true,
            data: {
                activeNodes,          
                credentialsSecured,   
                avgBlockTime,         
                networkUptime,
                blockchainMode
            }
        });

        setImmediate(async () => {
            await logAudit(req, 'SYSTEM_METRICS_QUERY', 'SUCCESS', `Diagnostic metrics retrieved.`, { 
                ip: req.ip, 
                userAgent: req.headers['user-agent'] 
            });
        });

    } catch (error) {
        logger.error("[❌ SYSTEM_METRICS_FAILURE]:", error.message);
        res.status(500).json({ success: false, message: "Metrics protocol error" });
    }
};

/**
 * @desc Get real-time protocol event ticker
 */
export const getTickerData = async (req, res) => {
    try {
        const blockchainMode = getBlockchainRuntimeInfo().mode;
        const events = [];
        const recentCerts = await Registry.find('certificates');
        const limitedCerts = recentCerts.slice(-5);

        limitedCerts.forEach(cert => {
            const shortHash = cert.certificateHash?.substring(0, 10).toUpperCase() || 'UNSYNCED';
            events.push(`TX_HASH: ${shortHash}... VERIFIED`);
        });

        const recentUnis = await Registry.find('universities', { status: 'APPROVED' });
        const limitedUnis = recentUnis.slice(-3);

        limitedUnis.forEach(uni => {
            events.push(`NODE: ${uni.name.toUpperCase()} SYNCED`);
        });

        events.push(`BLOCKCHAIN MODE: ${blockchainMode}`);

        if (events.length < 5) {
            events.unshift("HYBRID PROTOCOL ACTIVE", "MONITORING LIVE ACTIVITY");
        }

        res.status(200).json({ success: true, ticker: events });
    } catch (error) {
        res.status(500).json({ success: false, ticker: ["PROTOCOL_SYNC_ERROR"] });
    }
};

/**
 * @desc Get real-time Network Map (Institutional Nodes)
 */
export const getNetworkMap = async (req, res) => {
    try {
        const universities = await Registry.find('universities', { status: 'APPROVED' });

        const networkMap = universities.map(uni => ({
            id: uni.id,
            name: uni.name,
            nodeType: 'Institutional_Validator',
            status: 'APPROVED',
            location: uni.city || 'Global Cluster',
            joinedAt: uni.createdAt
        }));

        res.status(200).json({
            success: true,
            nodeCount: networkMap.length,
            network: networkMap
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Network map offline" });
    }
};

export const getUniversitiesGeo = async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
