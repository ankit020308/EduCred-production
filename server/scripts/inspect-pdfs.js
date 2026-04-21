
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

async function inspectUploads() {
  try {
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));
    console.log(`📂 Inspecting ${files.length} PDFs in uploads/...\n`);
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const dataBuffer = fs.readFileSync(filePath);
      
      const parser = new PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();
      const text = textResult.text;
      
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      
      // Heuristic extraction
      // Look for "Certificate of Completion" and the name after it
      let studentName = "Unknown";
      const certIdx = lines.findIndex(l => l.includes('Certificate of Completion'));
      if (certIdx !== -1 && lines[certIdx + 1]) {
        studentName = lines[certIdx + 1];
      } else {
        studentName = lines.find(l => l.length > 3 && !l.includes('CERTIFICATE') && !l.includes('EduCred')) || "Unknown";
      }
      
      const id = text.match(/ID:\s+(EDUCRED-\d+-\w+-\d+)/i)?.[1] || text.match(/EDUCRED-\d+-\w+-\d+/)?.[0] || "No ID found";
      
      console.log(`📄 File: ${file}`);
      console.log(`   👤 Student: ${studentName}`);
      console.log(`   🔑 ID: ${id}`);
      // console.log(`   [Debug] Text: ${text.substring(0, 100)}`);
      console.log('-------------------------------------------');
      
      await parser.destroy();
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspectUploads();
