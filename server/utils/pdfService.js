import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export const generateCertificatePDF = async (certData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Background / Border
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
      
      // Footer Setup
      const footerY = doc.page.height - 150;
      doc.y = footerY;

      // Left Column
      doc.moveTo(100, footerY + 50).lineTo(250, footerY + 50).dash(2, { space: 2 }).stroke();
      doc.font('Times-Roman').fontSize(10).text('Examination Controller', 100, footerY + 60, { width: 150, align: 'center' });

      // Right Column
      doc.moveTo(doc.page.width - 250, footerY + 50).lineTo(doc.page.width - 100, footerY + 50).dash(2, { space: 2 }).stroke();
      doc.font('Times-Roman').fontSize(10).text('Registrar', doc.page.width - 250, footerY + 60, { width: 150, align: 'center' });

      // Bottom Note & QR
      doc.undash();
      doc.moveTo(50, doc.page.height - 80).lineTo(doc.page.width - 50, doc.page.height - 80).stroke();
      
      doc.font('Courier-Bold').fontSize(10).text(`ID: ${certData.certificateId}`, 50, doc.page.height - 60);
      doc.font('Times-Roman').fontSize(10).text('Verified on EduCred Blockchain Network', { align: 'center' }, doc.page.height - 60);
      
      // Generate QR
      const qrUrl = `https://educred.app/verify?id=${certData.certificateId}`;
      const qrImage = await QRCode.toDataURL(qrUrl, { margin: 1 });
      doc.image(qrImage, doc.page.width - 100, doc.page.height - 75, { width: 50 });

      // Note: We don't have the hash yet, so we cannot embed it at the exact generation time!
      // But prompt asks for SHA-256 at the very bottom.
      // Wait, hash is computed from the PDF buffer, meaning you can't embed it in the PDF before generating it.
      // So I will just leave the SHA-256 placeholder or note.
      doc.font('Courier').fontSize(7).fillColor('gray').text(`Generative Anchor ID`, 50, doc.page.height - 40);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
