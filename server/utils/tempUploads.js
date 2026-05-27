import fs from 'fs';
import path from 'path';

const ONE_HOUR_MS = 60 * 60 * 1000;

export function cleanupTempUploads(tmpDir, now = Date.now()) {
  if (!fs.existsSync(tmpDir)) return 0;

  let removed = 0;
  for (const fileName of fs.readdirSync(tmpDir)) {
    const filePath = path.join(tmpDir, fileName);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      if (now - stat.mtimeMs > ONE_HOUR_MS) {
        fs.unlinkSync(filePath);
        removed += 1;
      }
    } catch { /* ignore individual cleanup failures */ }
  }
  return removed;
}
