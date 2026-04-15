import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getPrompt } from './server/ai-agent/promptEngine.js';

dotenv.config(); // Loads .env from root

async function runDiagnosticAudit() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY missing from .env");
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        systemInstruction: getPrompt('AUDIT', 'dummy').system
    });

    const contractPath = path.resolve(process.cwd(), 'blockchain/contracts/EduCred.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    console.log(`📡 [GEMINI]: Scanning ${path.basename(contractPath)}...`);
    const { user } = getPrompt('AUDIT', sourceCode);

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const audit = JSON.parse(result.response.text());

        console.log("\n─── 🛡️ GEMINI SECURITY AUDIT REPORT ───");
        console.log(`EXPLANATION: ${audit.explanation}`);
        console.log("\nFINDINGS / RISKS:");
        audit.risks.forEach((risk, i) => console.log(`  [${i+1}] ${risk}`));
        console.log(`\nCONFIDENCE: ${(audit.confidence * 100).toFixed(1)}%`);
        console.log("─────────────────────────────────────\n");

        if (audit.patch) {
            console.log("✅ PATCH SUGGESTED: Initializing local patch data...");
            fs.writeFileSync('audit_patch.diff', audit.patch);
            console.log("📄 Saved to: audit_patch.diff");
        }

    } catch (err) {
        console.error("❌ [DIAGNOSTIC]: Audit failed:", err.message);
    }
}

runDiagnosticAudit();
