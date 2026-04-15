// agentController.js
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import * as diff from 'diff';
import fetch from 'node-fetch';
import { getPrompt } from './promptEngine.js';
import { readProjectFile, resolveSafePath } from './codeAnalyzer.js';
import { validateSafety, normalizePatch } from './patchGenerator.js';

/**
 * EduCred AI Agent Controller (Hybrid Edition: OpenAI + Gemini)
 * Dynamically routes requests based on the AI_PROVIDER environment variable.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENAI_MODEL = 'gpt-4o';
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_API_VERSION = 'v1beta';

// ─── Provider Implementations ──────────────────────────────────────────────────

/**
 * OpenAI Implementation
 */
const callOpenAI = async (system, user) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is missing.');

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
    });

    return {
        text: response.choices[0].message.content,
        provider: 'openai'
    };
};

/**
 * Google Gemini Implementation (Universal REST Gateway)
 */
const callGemini = async (system, user) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing.');

    const url = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${GEMINI_MODEL}:generateContent`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey 
        },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini REST failure');

    return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text,
        provider: 'google-gemini'
    };
};

// ─── Core Orchestrator ────────────────────────────────────────────────────────

const handleAIAction = async (mode, req, res) => {
    const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();

    try {
        // 1. Context
        const contextResult = buildContext(req.body);
        if (contextResult.error) return res.status(contextResult.status).json({ error: contextResult.error });

        // 2. Prompt
        const { system, user } = getPrompt(mode, contextResult.context);

        // 3. Execution (Dynamic Routing)
        let aiResult;
        console.log(`📡 [AI Agent]: Dispatching ${mode} to ${provider.toUpperCase()}...`);

        if (provider === 'gemini') {
            aiResult = await callGemini(system, user);
        } else {
            aiResult = await callOpenAI(system, user);
        }

        // 4. Parse & Safety
        let aiOutput;
        try {
            aiOutput = JSON.parse(aiResult.text);
        } catch (err) {
            return res.status(502).json({ error: 'Malformed AI response.', details: aiResult.text });
        }

        const rawPatch = aiOutput.patch ?? '';
        if (!validateSafety(rawPatch).isSafe) {
            return res.status(403).json({ error: 'Security breach blocked.', provider: aiResult.provider });
        }

        return res.json({
            mode,
            provider: aiResult.provider,
            patch: normalizePatch(rawPatch),
            explanation: aiOutput.explanation ?? 'Analysis complete.',
            risks: aiOutput.risks ?? [],
            confidence: aiOutput.confidence ?? 0.0,
            approvalPrompt: 'Do you approve this change? (yes/no)'
        });

    } catch (err) {
        console.error(`[AI Agent] Deployment error — provider: ${provider}`, err);
        return res.status(500).json({ 
            error: 'AI agent failed.', 
            details: err.message,
            provider 
        });
    }
};

// ─── Utilities & Patching ─────────────────────────────────────────────────────

const buildContext = ({ code = '', filePath, featureDescription }) => {
    let baseCode = code;
    if (filePath) {
        const result = readProjectFile(filePath);
        if (result.error) return { error: result.error, status: 400 };
        baseCode = result;
    }
    return { context: featureDescription ? `Req: ${featureDescription}\nCode:\n${baseCode}` : baseCode };
};

export const applyPatch = async (req, res) => {
    const { filePath, patch } = req.body;
    try {
        const fullPath = resolveSafePath(filePath);
        const originalContent = fs.readFileSync(fullPath, 'utf8');
        const patchedContent = diff.applyPatch(originalContent, patch);
        fs.writeFileSync(`${fullPath}.bak`, originalContent);
        fs.writeFileSync(fullPath, patchedContent);
        return res.json({ success: true, filePath });
    } catch (err) {
        return res.status(500).json({ error: 'Patch application failure.', details: err.message });
    }
};

export const optimize = (req, res) => handleAIAction('OPTIMIZE', req, res);
export const generateFeature = (req, res) => handleAIAction('GENERATE_FEATURE', req, res);
export const audit = (req, res) => handleAIAction('AUDIT', req, res);
export const generateTests = (req, res) => handleAIAction('GENERATE_TESTS', req, res);