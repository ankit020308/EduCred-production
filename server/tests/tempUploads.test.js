import fs from 'fs';
import os from 'os';
import path from 'path';

const { cleanupTempUploads } = await import('../utils/tempUploads.js');

describe('startup temp upload cleanup', () => {
  it('removes files older than one hour and keeps newer files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'educred-temp-cleanup-'));
    const oldFile = path.join(dir, 'old.pdf');
    const newFile = path.join(dir, 'new.pdf');
    fs.writeFileSync(oldFile, 'old');
    fs.writeFileSync(newFile, 'new');

    const now = Date.now();
    fs.utimesSync(oldFile, new Date(now - 2 * 60 * 60 * 1000), new Date(now - 2 * 60 * 60 * 1000));
    fs.utimesSync(newFile, new Date(now), new Date(now));

    expect(cleanupTempUploads(dir, now)).toBe(1);
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(newFile)).toBe(true);
  });
});
