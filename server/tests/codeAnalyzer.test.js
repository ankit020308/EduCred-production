// server/tests/codeAnalyzer.test.js
import { jest } from '@jest/globals';

// 🎭 ESM Mocking Strategy
const mockFs = {
    existsSync: jest.fn(),
    statSync: jest.fn(),
    lstatSync: jest.fn(),
    readFileSync: jest.fn()
};

jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    ...mockFs
}));

// Await imports
const { readProjectFile, prepareContext } = await import('../ai-agent/codeAnalyzer.js');
const { default: fs } = await import('fs');

describe('🔍 AI Agent: Code Analyzer Suite', () => {

    describe('📁 readProjectFile()', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return an error for path traversal attempts', () => {
            const result = readProjectFile('../../../etc/passwd');
            expect(result).toHaveProperty('error');
            expect(result.error).toContain('Access denied');
        });

        it('should return an error for non-existent files', () => {
            mockFs.existsSync.mockReturnValue(false);
            const result = readProjectFile('non-existent.js');
            expect(result).toHaveProperty('error');
            expect(result.error).toContain('File not found');
        });

        it('should return an error for disallowed file extensions', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ isFile: () => true, size: 100 });
            mockFs.lstatSync.mockReturnValue({ isSymbolicLink: () => false });
            
            const result = readProjectFile('secret.exe');
            expect(result).toHaveProperty('error');
            expect(result.error).toContain('is not allowed');
        });

        it('should read valid files correctly', () => {
            const mockContent = 'console.log("hello")';
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ isFile: () => true, size: 100 });
            mockFs.lstatSync.mockReturnValue({ isSymbolicLink: () => false });
            mockFs.readFileSync.mockReturnValue(mockContent);
            
            const result = readProjectFile('utils/helper.js');
            expect(result).toBe(mockContent);
        });
    });

    describe('🧹 prepareContext()', () => {
        it('should collapse multiple blank lines', () => {
            const raw = "line 1\n\n\n\nline 2";
            const result = prepareContext(raw);
            expect(result).toBe("line 1\n\nline 2");
        });

        it('should strip decorative divider comments', () => {
            const raw = "// ─── Section ───\n// =================\nconst x = 1;";
            const result = prepareContext(raw);
            expect(result).not.toContain('==');
            expect(result).toContain('const x = 1;');
        });
    });
});
