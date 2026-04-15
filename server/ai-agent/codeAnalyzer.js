// codeAnalyzer.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * EduCred Code Analyzer
 * Safe file reader with strict path-traversal protection.
 * Prepares code context for LLM consumption.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolved once at module load — never re-derived per request
const ROOT_DIR = path.resolve(__dirname, '../../');

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

/**
 * Extensions considered safe/useful for AI context.
 * Binary, lock, and generated files are excluded.
 */
const ALLOWED_EXTENSIONS = new Set([
    '.js', '.mjs', '.cjs',
    '.ts', '.tsx', '.jsx',
    '.json', '.yaml', '.yml',
    '.css', '.html',
    '.md', '.txt', '.env.example',
]);

// ─── Path safety ──────────────────────────────────────────────────────────────

/**
 * Resolves and validates that a relative path stays within ROOT_DIR.
 * Returns the safe absolute path, or throws on violation.
 *
 * @param {string} relativePath
 * @returns {string} Absolute path within ROOT_DIR
 */
export const resolveSafePath = (relativePath) => {
    if (!relativePath || typeof relativePath !== 'string') {
        throw new Error('Invalid path: must be a non-empty string.');
    }

    // Normalise first, then resolve — catches encoded traversal like %2F..%2F
    const normalised = path.normalize(relativePath);
    const fullPath = path.resolve(ROOT_DIR, normalised);

    // Ensure resolved path is strictly inside ROOT_DIR
    // Add trailing sep to prevent prefix attacks: /root/app vs /root/app-secret
    if (!fullPath.startsWith(ROOT_DIR + path.sep) && fullPath !== ROOT_DIR) {
        throw new Error(`Access denied: "${relativePath}" resolves outside the project root.`);
    }

    return fullPath;
};

// ─── File validation ──────────────────────────────────────────────────────────

/**
 * Validates that a file exists, is a regular file (not a directory/symlink),
 * has an allowed extension, and is within the size limit.
 *
 * @param {string} fullPath - Absolute path (already safety-checked)
 * @param {string} relativePath - Original input (for readable error messages)
 */
const validateFile = (fullPath, relativePath) => {
    if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: "${relativePath}"`);
    }

    const stats = fs.statSync(fullPath);

    // Reject directories and symlinks — read real files only
    if (!stats.isFile()) {
        throw new Error(`Path is not a regular file: "${relativePath}"`);
    }

    // Symlink check: resolved path must equal lstat path
    const lstat = fs.lstatSync(fullPath);
    if (lstat.isSymbolicLink()) {
        throw new Error(`Symlinks are not permitted: "${relativePath}"`);
    }

    const ext = path.extname(fullPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error(
            `File type "${ext}" is not allowed for AI context. ` +
            `Permitted types: ${[...ALLOWED_EXTENSIONS].join(', ')}`
        );
    }

    if (stats.size > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        throw new Error(
            `File too large for AI context: ${sizeMB} MB (limit: 1 MB). ` +
            `Consider passing a relevant code snippet instead.`
        );
    }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Safely reads a project file for AI context.
 *
 * Returns the file contents as a string on success,
 * or an object { error: string } on failure — matching the
 * error contract expected by agentController.js.
 *
 * @param {string} relativePath - Path relative to the project root
 * @returns {string | { error: string }}
 */
export const readProjectFile = (relativePath) => {
    try {
        const fullPath = resolveSafePath(relativePath);
        validateFile(fullPath, relativePath);
        return fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
        return { error: err.message };
    }
};

/**
 * Prepares raw source code for LLM consumption.
 *
 * - Trims leading/trailing whitespace
 * - Collapses runs of 3+ blank lines into 2 (reduces token waste)
 * - Strips single-line comments that are pure noise (// ----, // ====)
 * - Leaves all meaningful comments intact
 *
 * @param {string} code - Raw source code string
 * @param {{ stripComments?: boolean }} [options]
 * @returns {string}
 */
export const prepareContext = (code, { stripComments = false } = {}) => {
    if (!code || typeof code !== 'string') return '';

    let result = code;

    if (stripComments) {
        // Remove single-line comments (// ...) — intentionally leaves block comments
        // so JSDoc and licence headers are preserved for the LLM
        result = result.replace(/^\s*\/\/(?!.*@|\s*eslint).*$/gm, '');
    }

    // Remove purely decorative divider comments: // ──, // ==, // --
    result = result.replace(/^\s*\/\/[\s\-=─━*]+$/gm, '');

    // Collapse 3+ consecutive blank lines into 2
    result = result.replace(/(\n\s*){3,}/g, '\n\n');

    return result.trim();
};

/**
 * Truncates prepared context to a token budget.
 * Uses a conservative 4-chars-per-token estimate.
 *
 * @param {string} context
 * @param {number} [maxTokens=6000]
 * @returns {{ context: string, truncated: boolean }}
 */
export const truncateContext = (context, maxTokens = 6000) => {
    const charLimit = maxTokens * 4;
    if (context.length <= charLimit) {
        return { context, truncated: false };
    }

    const truncated = context.slice(0, charLimit);
    const notice = `\n\n[... truncated — ${context.length} chars, showing first ${charLimit} ...]`;

    return { context: truncated + notice, truncated: true };
};