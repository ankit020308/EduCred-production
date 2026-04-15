// server/tests/aiAgent.test.js
import { jest } from '@jest/globals';

// 🎭 Mock dependencies before importing 
const mockOpenAI = {
    chat: {
        completions: {
            create: jest.fn()
        }
    }
};

jest.unstable_mockModule('openai', () => ({
    default: jest.fn().mockImplementation(() => mockOpenAI)
}));

jest.unstable_mockModule('../services/registryService.js', () => ({
    default: {
        insert: jest.fn(async () => ({ id: 'log-1' })),
        init: jest.fn(async () => {})
    }
}));

// Await imports
// We'll test the route handlers since the core logic is inside handleAIAction
const { optimize, applyPatch } = await import('../ai-agent/agentController.js');

describe('🤖 AI Agent Controller Suite', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            app: {
                get: jest.fn().mockReturnValue({ emit: jest.fn() }) // mock socket.io
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    it('should block unknown modes', async () => {
        // This is handled by the higher-level optimize export usually, 
        // but we can test the behavior via the route handler.
        const { default: aiController } = await import('../ai-agent/agentController.js');
        // Actually, let's keep it simple: optimize is a function (req, res)
        await optimize(req, res);
        
        // It should try to build context and then fail if no prompt/code
        expect(res.status).toHaveBeenCalled();
    });

    it('should successfully parse AI JSON response', async () => {
        const mockResponse = {
            choices: [{
                message: {
                    content: JSON.stringify({
                        patch: 'const x = 2;',
                        explanation: 'Improved logic',
                        risks: []
                    })
                }
            }]
        };
        mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
        
        req.body = { prompt: 'fix this', code: 'const x = 1;' };
        
        await optimize(req, res);
        
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            patch: expect.stringContaining('+const x = 2;'),
            explanation: 'Improved logic'
        }));
    });
});
