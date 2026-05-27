import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';

const { validateUploadedFileMagicBytes } = await import('../middleware/uploadMiddleware.js');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('upload magic-byte validation', () => {
  it('blocks a malicious SVG uploaded with a spoofed image/png content type', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'educred-upload-'));
    const filePath = path.join(dir, 'payload.png');
    fs.writeFileSync(filePath, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

    const req = {
      file: {
        path: filePath,
        mimetype: 'image/png',
        originalname: 'payload.png',
      },
    };
    const res = makeRes();
    const next = jest.fn();

    await validateUploadedFileMagicBytes()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file type.' });
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
