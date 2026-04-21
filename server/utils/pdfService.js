import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fetch from 'node-fetch';

const FRONTEND_BASE = process.env.FRONTEND_URL || 'https://educred.in';

export const generateCertificatePDF = async (certData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const verifyUrl = `${FRONTEND_BASE}/verify/${certData.certificateId}`;

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
        info: {
          Title: `EduCred Certificate — ${certData.certificateId}`,
          Author: certData.universityName,
          Subject: certData.certificateId,
          Keywords: certData.certificateHash || '',
          Creator: 'EduCred Blockchain Platform',
          Producer: 'EduCred',
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        // SHA-256 of the PDF binary — stored at issuance for tamper verification
        const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        resolve({ buffer: pdfBuffer, pdfHash });
      });

      // Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1a3a6b');
      doc.rect(22, 22, doc.page.width - 44, doc.page.height - 44).stroke('#1a3a6b');

      // Header
      doc.font('Times-Bold').fontSize(36).text(certData.universityName, { align: 'center', margin: 20 });
      doc.font('Times-Italic').fontSize(16).text('Office of the Registrar', { align: 'center' });

      doc.moveDown(1);
      doc.moveTo(100, doc.y).lineTo(doc.page.width - 100, doc.y).stroke();
      doc.moveDown(2);

      // Body
      doc.font('Times-Roman').fontSize(14).text('This is to certify that', { align: 'center' });
      doc.moveDown(1);
      doc.font('Times-Bold').fontSize(28).text(certData.studentName, { align: 'center', characterSpacing: 2 });
      doc.moveDown(1);
      doc.font('Times-Roman').fontSize(12).text('has successfully completed all requirements for the award of the degree of', { align: 'center' });
      doc.moveDown(1);
      doc.font('Times-Bold').fontSize(18).text(`${certData.programName} in ${certData.branch}`, { align: 'center' });
      doc.moveDown(1);

      if (certData.cgpa) {
        doc.font('Times-Roman').fontSize(12).text(`with a CGPA of ${certData.cgpa}`, { align: 'center' });
        doc.moveDown(1);
      }

      doc.font('Times-Roman').fontSize(12).text(`from ${certData.universityName}, ${certData.city || 'India'}`, { align: 'center' });
      doc.moveDown(1);
      doc.font('Times-Roman').fontSize(12).text(`in the year ${certData.graduationYear}`, { align: 'center' });

      // Footer
      const footerY = doc.page.height - 150;
      doc.y = footerY;

      doc.moveTo(100, footerY + 50).lineTo(250, footerY + 50).dash(2, { space: 2 }).stroke();
      doc.font('Times-Roman').fontSize(10).text('Examination Controller', 100, footerY + 60, { width: 150, align: 'center' });

      doc.moveTo(doc.page.width - 250, footerY + 50).lineTo(doc.page.width - 100, footerY + 50).dash(2, { space: 2 }).stroke();
      doc.font('Times-Roman').fontSize(10).text('Registrar', doc.page.width - 250, footerY + 60, { width: 150, align: 'center' });

      doc.undash();
      doc.moveTo(50, doc.page.height - 80).lineTo(doc.page.width - 50, doc.page.height - 80).stroke();

      doc.font('Courier-Bold').fontSize(10).text(`ID: ${certData.certificateId}`, 50, doc.page.height - 60);
      doc.font('Times-Roman').fontSize(10).text('Verified on EduCred Blockchain Network', { align: 'center' }, doc.page.height - 60);

      // QR code — points to public verify URL so any scanner opens the verification page
      const qrImage = await QRCode.toDataURL(verifyUrl, { margin: 1 });
      doc.image(qrImage, doc.page.width - 100, doc.page.height - 75, { width: 50 });

      // Hash fingerprint (truncated display only — full hash is in PDF metadata Keywords)
      const displayHash = certData.certificateHash
        ? certData.certificateHash.slice(0, 16) + '…'
        : '';
      doc.font('Courier').fontSize(7).fillColor('gray').text(`Hash: ${displayHash}`, 50, doc.page.height - 40);

      // Student photo — top-right corner, silent on any fetch/embed failure
      if (certData.profileImageUrl) {
        try {
          const photoRes = await fetch(certData.profileImageUrl);
          if (photoRes.ok) {
            const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
            doc.image(photoBuffer, doc.page.width - 110, 28, { width: 80, height: 80 });
          }
        } catch (photoErr) {
          console.warn('[PDF] Student photo embed skipped:', photoErr.message);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
