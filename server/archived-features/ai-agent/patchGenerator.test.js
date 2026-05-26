// server/tests/patchGenerator.test.js
import { validateSafety, normalizePatch } from '../ai-agent/patchGenerator.js';

describe('🧠 AI Agent: Patch Security & Normalisation Suite', () => {

    describe('🛡️ validateSafety()', () => {
        it('should allow safe code changes', () => {
            const safePatch = `
            --- a/utils.js
            +++ b/utils.js
            @@ -1,5 +1,5 @@
            -const x = 1;
            +const x = 2;
            `;
            const result = validateSafety(safePatch);
            expect(result.isSafe).toBe(true);
        });

        it('should block destructive fs calls', () => {
            const unsafe = "fs.unlinkSync('/etc/passwd')";
            const result = validateSafety(unsafe);
            expect(result.isSafe).toBe(false);
            expect(result.reason).toContain('Destructive filesystem operation');
        });

        it('should block arbitrary execution (child_process)', () => {
            const unsafe = "import { exec } from 'child_process'; exec('rm -rf /')";
            const result = validateSafety(unsafe);
            expect(result.isSafe).toBe(false);
            expect(result.reason).toContain('child_process');
        });

        it('should block eval code execution', () => {
            const unsafe = "eval('console.log(process.env)')";
            const result = validateSafety(unsafe);
            expect(result.isSafe).toBe(false);
            expect(result.reason).toContain('eval()');
        });

        it('should block path traversal sequences', () => {
            const unsafe = "../../hidden/secrets.js";
            const result = validateSafety(unsafe);
            expect(result.isSafe).toBe(false);
            expect(result.reason).toContain('Path traversal');
        });
    });

    describe('📝 normalizePatch()', () => {
        it('should return a valid unified diff as-is (trimmed)', () => {
            const raw = `
@@ -1 +1 @@
-old
+new
            `;
            const result = normalizePatch(raw);
            expect(result.startsWith('@@')).toBe(true);
            expect(result).not.toContain('\n ');
        });

        it('should wrap plain text in a diff envelope', () => {
            const raw = "const x = 100;";
            const result = normalizePatch(raw);
            expect(result).toContain('--- a/suggested_changes');
            expect(result).toContain('+const x = 100;');
        });

        it('should strip markdown code fences', () => {
            const raw = "```diff\n@@ -1 +1 @@\n-1\n+2\n```";
            const result = normalizePatch(raw);
            expect(result).not.toContain('```');
            expect(result).toContain('@@');
        });
    });
});
