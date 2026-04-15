// patchGenerator.js

/**
 * EduCred Patch Generator & Security Guard
 *
 * Responsibilities:
 *  1. Validate AI-generated patches against a security ruleset
 *  2. Normalise raw AI output into a readable, structured diff format
 */

// ─── Security ruleset ─────────────────────────────────────────────────────────

/**
 * Each rule has:
 *  - pattern  : RegExp tested against the full patch string
 *  - reason   : Human-readable explanation returned to the caller
 *
 * Prefer RegExp over plain string includes() so rules can match
 * variations (different quote styles, whitespace, casing) in one entry.
 */
const SECURITY_RULES = [
    {
        pattern: /\bfs\s*\.\s*(unlink|rmdir|rm|writeFile|appendFile|chmod|chown|mkdirSync|rmdirSync|unlinkSync|writeFileSync|appendFileSync|chmodSync|chownSync)\b/i,
        reason: 'Destructive filesystem operation detected (fs.unlink / writeFile / chmod …)',
    },
    {
        pattern: /\brequire\s*\(\s*['"`]child_process['"`]\s*\)|\bimport\s+.*['"`]child_process['"`]/,
        reason: 'child_process import detected — arbitrary command execution risk',
    },
    {
        pattern: /\b(exec|execSync|spawn|spawnSync|execFile|fork)\s*\(/,
        reason: 'Shell execution call detected (exec / spawn / execFile …)',
    },
    {
        pattern: /\beval\s*\(/,
        reason: 'eval() detected — arbitrary code execution risk',
    },
    {
        pattern: /\bnew\s+Function\s*\(/,
        reason: 'new Function() detected — equivalent to eval()',
    },
    {
        pattern: /\bprocess\s*\.\s*exit\s*\(/,
        reason: 'process.exit() detected — would terminate the server',
    },
    {
        pattern: /\brequire\s*\(\s*['"`]os['"`]\s*\)|\bimport\s+.*['"`]os['"`]/,
        reason: 'os module import detected — system information exposure risk',
    },
    {
        pattern: /\.\.[\\/]/,
        reason: 'Path traversal sequence detected (../ or ..\\ )',
    },
    {
        pattern: /\/etc\/(?:passwd|shadow|hosts|sudoers)/,
        reason: 'Reference to sensitive system file detected (/etc/passwd …)',
    },
    {
        pattern: /\bprocess\s*\.\s*env\b/,
        reason: 'process.env access detected — environment variable exposure risk',
    },
    {
        pattern: /\b(__proto__|prototype\s*\[|constructor\s*\[)/,
        reason: 'Prototype pollution pattern detected',
    },
];

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates an AI-generated patch against all security rules.
 *
 * Returns early on the first violation found — no need to collect all of
 * them since any single violation blocks the patch.
 *
 * @param {string} patch
 * @returns {{ isSafe: true } | { isSafe: false, reason: string, rule: string }}
 */
export const validateSafety = (patch) => {
    if (!patch || typeof patch !== 'string') {
        return { isSafe: false, reason: 'Patch is empty or not a string.', rule: 'input-validation' };
    }

    for (const { pattern, reason } of SECURITY_RULES) {
        if (pattern.test(patch)) {
            return {
                isSafe: false,
                reason,
                rule: pattern.source,   // include pattern source for audit logging
            };
        }
    }

    return { isSafe: true };
};

// ─── Patch normalisation ──────────────────────────────────────────────────────

/**
 * Detects whether a string looks like a real unified diff.
 * A valid unified diff has at least one hunk header (@@ … @@).
 *
 * @param {string} text
 * @returns {boolean}
 */
const isUnifiedDiff = (text) => /^@@\s+-\d+,?\d*\s+\+\d+,?\d*\s+@@/m.test(text);

/**
 * Wraps plain (non-diff) AI output in a minimal unified diff envelope
 * so the frontend can render it consistently.
 *
 * Every line is prefixed with '+' (addition) since the AI produced new
 * content rather than a delta against a specific original.
 *
 * @param {string} rawOutput
 * @returns {string}
 */
const wrapAsPlainDiff = (rawOutput) => {
    const lines = rawOutput.split('\n');
    const diffLines = lines.map(line => {
        if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
            return line;   // already has a diff prefix — leave intact
        }
        return `+${line}`;
    });

    return [
        '--- a/suggested_changes',
        '+++ b/suggested_changes',
        `@@ -0,0 +1,${lines.length} @@`,
        ...diffLines,
    ].join('\n');
};

/**
 * Normalises raw AI output into a structured unified diff string.
 *
 * - If the output is already a valid unified diff → return as-is (trimmed)
 * - Otherwise → wrap it in a diff envelope
 * - Code fences (```diff … ```) are stripped before processing
 *
 * @param {string} rawOutput
 * @returns {string}
 */
export const normalizePatch = (rawOutput) => {
    if (!rawOutput || typeof rawOutput !== 'string') return '';

    // Strip markdown code fences the model sometimes adds
    const stripped = rawOutput
        .replace(/^```(?:diff|patch)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

    return isUnifiedDiff(stripped) ? stripped : wrapAsPlainDiff(stripped);
};

// ─── Audit summary ────────────────────────────────────────────────────────────

/**
 * Returns a human-readable summary of all active security rules.
 * Useful for logging at startup or exposing via an admin endpoint.
 *
 * @returns {string[]}
 */
export const listSecurityRules = () =>
    SECURITY_RULES.map(({ reason }) => reason);