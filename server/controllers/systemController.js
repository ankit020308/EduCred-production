import os from 'os';
import process from 'process';
import Certificate from '../models/Certificate.js';
import University from '../models/University.js';
import { logAudit } from '../utils/logger.js';
import UniversityGeo from '../models/UniversityGeo.js';
import { blockchainMode } from '../utils/blockchain.js';

/**
 * @desc Get real-time global system statistics
 * @route GET /api/system/stats
 * @access Public
 */
export const getSystemStats = async (req, res) => {
    try {
        // 1. Credentials Secured (Real-time DB Count)
        const totalCertificates = await Certificate.countDocuments();
        let credentialsSecured = totalCertificates.toString();
        
        if (totalCertificates >= 1000000) {
            credentialsSecured = (totalCertificates / 1000000).toFixed(1) + "M+";
        } else if (totalCertificates >= 1000) {
            credentialsSecured = (totalCertificates / 1000).toFixed(1) + "K+";
        } else if (totalCertificates > 0) {
            credentialsSecured = totalCertificates.toLocaleString();
        } else {
            credentialsSecured = "0";
        }

        // 2. Active Nodes (Strictly Approved Universities)
        const universityNodes = await University.countDocuments({ status: 'APPROVED' });
        const activeNodes = universityNodes.toLocaleString();

        // 3. Service uptime derived from current process uptime
        const serverUptimeSeconds = process.uptime();
        const networkUptime = `${(serverUptimeSeconds / 3600).toFixed(2)}h`;

        // 4. Report only what we can actually support right now
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

        // 6. Asynchronous Audit Logging (Low-stakes query tracking)
        setImmediate(async () => {
            await logAudit(req, 'SYSTEM_METRICS_QUERY', 'SUCCESS', `Diagnostic metrics retrieved from endpoint.`, { 
                ip: req.ip, 
                userAgent: req.headers['user-agent'] 
            });
        });

    } catch (error) {
        console.error("[❌ SYSTEM_METRICS_FAILURE]:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Real-time metrics engine offline" 
        });
    }
};

/**
 * @desc Get real-time protocol event ticker
 * @route GET /api/system/ticker
 * @access Public
 */
export const getTickerData = async (req, res) => {
    try {
        const events = [];

        // 1. Recent Certificates (Last 5)
        const recentCerts = await Certificate.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('certificateHash studentName')
            .lean();

        recentCerts.forEach(cert => {
            const shortHash = cert.certificateHash.substring(0, 10).toUpperCase();
            events.push(`TX_HASH: ${shortHash}... VERIFIED`);
        });

        // 2. Recent Institutional Joins (Last 3)
        const recentUnis = await University.find({ status: 'APPROVED' })
            .sort({ updatedAt: -1 })
            .limit(3)
            .select('name')
            .lean();

        recentUnis.forEach(uni => {
            events.push(`NODE: ${uni.name.toUpperCase()} SYNCED`);
        });

        events.push(`BLOCKCHAIN MODE: ${blockchainMode}`);
        events.push(`APPROVED NODES: ${recentUnis.length}`);
        events.push(`CERTIFICATES INDEXED: ${recentCerts.length}`);

        // If no real events exist yet, provide initializing placeholders
        if (events.length < 5) {
            events.unshift("REGISTRY INITIALIZING...", "AWAITING LIVE ACTIVITY");
        }

        res.status(200).json({
            success: true,
            ticker: events
        });

    } catch (error) {
        console.error("[❌ TICKER_FAILURE]:", error.message);
        res.status(500).json({ success: false, ticker: ["PROTOCOL_SYNC_ERROR"] });
    }
};

/**
 * @desc Get real-time Network Map (Institutional Nodes)
 * @route GET /api/system/map
 * @access Public
 */
export const getNetworkMap = async (req, res) => {
    try {
        // Fetch all approved institutions
        const universities = await University.find({ status: 'APPROVED' })
            .select('name createdAt location description')
            .lean();

        // Map to specialized "Wow" payload format
        const networkMap = universities.map(uni => ({
            id: uni._id,
            name: uni.name,
            nodeType: 'Institutional_Validator',
            status: 'APPROVED',
            location: uni.location || 'Global Cluster', // Fallback if no location set
            joinedAt: uni.createdAt
        }));

        res.status(200).json({
            success: true,
            nodeCount: networkMap.length,
            network: networkMap
        });

    } catch (error) {
        console.error("[❌ NETWORK_MAP_FAILURE]:", error.message);
        res.status(500).json({ success: false, message: "Protocol map offline" });
    }
};

export const getUniversitiesGeo = async (req, res) => {
    try {
        const geo = await UniversityGeo.find({ isActive: true });
        res.json(geo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
