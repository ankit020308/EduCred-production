import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fetch from 'node-fetch';

const FRONTEND_BASE = process.env.FRONTEND_URL || 'https://educred.in';

// Design constants
const NAVY   = '#1a1a2e';
const GOLD   = '#c9a227';
const WHITE  = '#ffffff';
const GRAY   = '#888888';
const LIGHT  = '#f0f0f0';

export const generateCertificatePDF = async (certData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const verifyUrl = `${FRONTEND_BASE}/verify/${certData.certificateId}`;

      const W = 841.89; // A4 landscape width  (pt)
      const H = 595.28; // A4 landscape height (pt)

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
        info: {
          Title:    `EduCred Certificate — ${certData.certificateId}`,
          Author:   certData.universityName,
          Subject:  certData.certificateId,
          Keywords: certData.certificateHash || '',
          Creator:  'EduCred Blockchain Platform',
          Producer: 'EduCred',
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        resolve({ buffer: pdfBuffer, pdfHash });
      });

      // ── 1. OUTER DECORATIVE BORDER ──────────────────────────────────────────
      doc.rect(8, 8, W - 16, H - 16).lineWidth(3).strokeColor(NAVY).stroke();
      doc.rect(14, 14, W - 28, H - 28).lineWidth(1).strokeColor(NAVY).stroke();

      // ── 2. NAVY HEADER STRIPE ───────────────────────────────────────────────
      const STRIPE_H = 82;
      doc.rect(0, 0, W, STRIPE_H).fill(NAVY);

      // EduCred logo text (left side of stripe)
      doc.font('Helvetica-Bold').fontSize(22).fillColor(WHITE)
        .text('EduCred', 36, 24, { lineBreak: false });
      doc.font('Helvetica').fontSize(10).fillColor(WHITE).opacity(0.6)
        .text('Blockchain-Verified Academic Credentials', 36, 50, { lineBreak: false });
      doc.opacity(1);

      // University name in gold (centered)
      doc.font('Helvetica-Bold').fontSize(13).fillColor(GOLD)
        .text(certData.universityName || 'University', 200, 34, { width: W - 400, align: 'center', lineBreak: false });

      // Blockchain verified badge (right side)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD)
        .text('✓ BLOCKCHAIN VERIFIED', W - 180, 36, { width: 150, align: 'right', lineBreak: false });

      // ── 3. CIRCULAR EMBLEM (top-left below stripe) ──────────────────────────
      const EMB_X = 58;
      const EMB_Y = STRIPE_H + 24;
      const EMB_R = 45;
      doc.circle(EMB_X, EMB_Y + EMB_R, EMB_R).lineWidth(2).strokeColor(NAVY).fillAndStroke(LIGHT, NAVY);
      const initial = (certData.universityName || 'U').charAt(0).toUpperCase();
      doc.font('Times-Bold').fontSize(32).fillColor(NAVY)
        .text(initial, EMB_X - EMB_R + 8, EMB_Y + EMB_R - 20, { width: EMB_R * 2 - 16, align: 'center', lineBreak: false });

      // ── 4. STUDENT PHOTO (top-right, if available) ──────────────────────────
      if (certData.profileImageUrl) {
        try {
          const photoRes = await fetch(certData.profileImageUrl);
          if (photoRes.ok) {
            const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
            // Photo box: top-right inside border
            const PX = W - 110;
            const PY = STRIPE_H + 16;
            doc.rect(PX, PY, 90, 90).lineWidth(1).strokeColor(NAVY).stroke();
            doc.image(photoBuffer, PX + 1, PY + 1, { width: 88, height: 88 });
          }
        } catch (photoErr) {
          console.warn('[PDF] Photo embed skipped:', photoErr.message);
        }
      }

      // ── 5. BODY CONTENT (centered) ──────────────────────────────────────────
      const BODY_TOP = STRIPE_H + 28;
      const CENTER_X = W / 2;

      // "CERTIFICATE OF COMPLETION" label
      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text('CERTIFICATE OF COMPLETION', 0, BODY_TOP, { width: W, align: 'center', characterSpacing: 4 });

      // Student name
      doc.font('Times-Bold').fontSize(32).fillColor(NAVY)
        .text(certData.studentName || '', 0, BODY_TOP + 22, { width: W, align: 'center', characterSpacing: 1 });

      // Gold underline rule beneath name
      const nameY = BODY_TOP + 22 + 36 + 4;
      doc.moveTo(CENTER_X - 120, nameY).lineTo(CENTER_X + 120, nameY)
        .lineWidth(2).strokeColor(GOLD).stroke();

      // Intro text
      doc.font('Times-Roman').fontSize(11).fillColor('#444444')
        .text('has successfully completed all requirements for the degree of', 0, nameY + 12, { width: W, align: 'center' });

      // Degree + branch
      const degreeLabel = `${certData.programName || ''}${certData.branch ? ' in ' + certData.branch : ''}`;
      doc.font('Times-Bold').fontSize(18).fillColor(NAVY)
        .text(degreeLabel, 0, nameY + 30, { width: W, align: 'center' });

      // CGPA
      if (certData.cgpa) {
        doc.font('Times-Italic').fontSize(11).fillColor(GRAY)
          .text(`with a CGPA of ${certData.cgpa}`, 0, nameY + 57, { width: W, align: 'center' });
      }

      // University + city + year
      const detailY = nameY + (certData.cgpa ? 76 : 60);
      doc.font('Times-Roman').fontSize(11).fillColor('#444444')
        .text(`${certData.universityName}${certData.city ? ', ' + certData.city : ''} — ${certData.graduationYear || new Date().getFullYear()}`,
          0, detailY, { width: W, align: 'center' });

      // ── 6. FOOTER ROW ────────────────────────────────────────────────────────
      const FOOTER_Y = H - 108;

      // Left signature — Exam Controller
      doc.moveTo(70, FOOTER_Y + 40).lineTo(220, FOOTER_Y + 40)
        .lineWidth(0.8).dash(3, { space: 2 }).strokeColor(NAVY).stroke().undash();
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text('Examination Controller', 70, FOOTER_Y + 46, { width: 150, align: 'center' });

      // Center — QR code
      const QR_SIZE = 64;
      const qrImage = await QRCode.toDataURL(verifyUrl, { margin: 1, color: { dark: NAVY, light: '#ffffff' } });
      doc.image(qrImage, CENTER_X - QR_SIZE / 2, FOOTER_Y + 6, { width: QR_SIZE, height: QR_SIZE });
      doc.font('Helvetica').fontSize(7).fillColor(GRAY)
        .text('Scan to Verify', CENTER_X - 32, FOOTER_Y + QR_SIZE + 10, { width: 64, align: 'center' });

      // Right signature — Registrar
      doc.moveTo(W - 220, FOOTER_Y + 40).lineTo(W - 70, FOOTER_Y + 40)
        .lineWidth(0.8).dash(3, { space: 2 }).strokeColor(NAVY).stroke().undash();
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text('Registrar', W - 220, FOOTER_Y + 46, { width: 150, align: 'center' });

      // ── 7. SECURITY STRIP ────────────────────────────────────────────────────
      const STRIP_Y = H - 26;
      doc.rect(16, STRIP_Y - 4, W - 32, 20).fill(LIGHT);

      doc.font('Courier-Bold').fontSize(8).fillColor('#555555')
        .text(`ID: ${certData.certificateId}`, 24, STRIP_Y + 1, { lineBreak: false });

      const displayHash = certData.certificateHash
        ? certData.certificateHash.slice(0, 20) + '…'
        : '';
      doc.font('Courier').fontSize(8).fillColor('#555555')
        .text(`Hash: ${displayHash}`, W - 260, STRIP_Y + 1, { width: 240, align: 'right', lineBreak: false });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
