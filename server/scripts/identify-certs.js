
import Registry from '../services/registryService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function identifyCerts() {
  try {
    await Registry.init();
    const ids = ['EDUCRED-2026-BTE-61766', 'EDUCRED-2026-ADV-98033', 'EDUCRED-2026-PRO-58613'];
    
    console.log('🔍 Identifying Certificates in Registry...');
    
    for (const cid of ids) {
      const cert = await Registry.findOne('certificates', { certificateId: cid });
      if (cert) {
        console.log(`\n✅ ID: ${cid}`);
        console.log(`   Student: ${cert.studentName} (${cert.studentEmail})`);
        console.log(`   University: ${cert.universityName || cert.issuer}`);
        console.log(`   Program: ${cert.course}`);
        console.log(`   Status: ${cert.status}`);
        console.log(`   Issued At: ${cert.createdAt}`);
      } else {
        // Filename has cert ID, but maybe it's slightly different
        const all = await Registry.find('certificates');
        const match = all.find(c => c.certificateId.includes(cid.split('-').pop()));
        if (match) {
          console.log(`\n⚠️ Partial match for ID: ${cid} (Found ${match.certificateId})`);
          console.log(`   Student: ${match.studentName} (${match.studentEmail})`);
        } else {
          console.log(`\n❌ ID: ${cid} NOT FOUND in Registry.`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

identifyCerts();
