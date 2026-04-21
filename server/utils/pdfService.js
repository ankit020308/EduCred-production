import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fetch from 'node-fetch';

const FRONTEND_BASE = process.env.FRONTEND_URL || 'https://educred.in';

const NAVY  = '#1a1a2e';
const GOLD  = '#c9a227';
const WHITE = '#ffffff';
const GRAY  = '#888888';
const LIGHT = '#f0f0f0';

function gradeFromMarks(marks) {
  const m = Number(marks);
  if (isNaN(m)) return '—';
  if (m >= 90) return 'O';
  if (m >= 80) return 'A+';
  if (m >= 70) return 'A';
  if (m >= 60) return 'B+';
  if (m >= 50) return 'B';
  if (m >= 40) return 'C';
  return 'F';
}

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
          Subject:  certData.certificateId,   // extracted by verifyPDFCertificate
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

      const subjects = Array.isArray(certData.subjects) ? certData.subjects : [];
      const hasSubjects = subjects.length > 0;

      // ── 1. OUTER DECORATIVE BORDER ──────────────────────────────────────────
      doc.rect(8, 8, W - 16, H - 16).lineWidth(3).strokeColor(NAVY).stroke();
      doc.rect(14, 14, W - 28, H - 28).lineWidth(1).strokeColor(NAVY).stroke();

      // ── 2. NAVY HEADER STRIPE ───────────────────────────────────────────────
      const STRIPE_H = 82;
      doc.rect(0, 0, W, STRIPE_H).fill(NAVY);

      doc.font('Helvetica-Bold').fontSize(22).fillColor(WHITE)
        .text('EduCred', 36, 24, { lineBreak: false });
      doc.font('Helvetica').fontSize(10).fillColor(WHITE).opacity(0.6)
        .text('Blockchain-Verified Academic Credentials', 36, 50, { lineBreak: false });
      doc.opacity(1);

      doc.font('Helvetica-Bold').fontSize(13).fillColor(GOLD)
        .text(certData.universityName || 'University', 200, 34, { width: W - 400, align: 'center', lineBreak: false });

      doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD)
        .text('✓ BLOCKCHAIN VERIFIED', W - 180, 36, { width: 150, align: 'right', lineBreak: false });

      // ── 3. CIRCULAR EMBLEM (top-left, below stripe) ─────────────────────────
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
            const PX = W - 110;
            const PY = STRIPE_H + 16;
            doc.rect(PX, PY, 90, 90).lineWidth(1).strokeColor(NAVY).stroke();
            doc.image(photoBuffer, PX + 1, PY + 1, { width: 88, height: 88 });
          }
        } catch (photoErr) {
          console.warn('[PDF] Photo embed skipped:', photoErr.message);
        }
      }

      // ── 5. BODY — certificate header ────────────────────────────────────────
      const BODY_TOP = STRIPE_H + 28;
      const CENTER_X = W / 2;

      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text('CERTIFICATE OF COMPLETION', 0, BODY_TOP, { width: W, align: 'center', characterSpacing: 4 });

      doc.font('Times-Bold').fontSize(32).fillColor(NAVY)
        .text(certData.studentName || '', 0, BODY_TOP + 22, { width: W, align: 'center', characterSpacing: 1 });

      const nameY = BODY_TOP + 22 + 36 + 4; // ~172
      doc.moveTo(CENTER_X - 120, nameY).lineTo(CENTER_X + 120, nameY)
        .lineWidth(2).strokeColor(GOLD).stroke();

      doc.font('Times-Roman').fontSize(11).fillColor('#444444')
        .text('has successfully completed all requirements for the degree of', 0, nameY + 12, { width: W, align: 'center' });

      const degreeLabel = `${certData.programName || ''}${certData.branch ? ' in ' + certData.branch : ''}`;
      doc.font('Times-Bold').fontSize(18).fillColor(NAVY)
        .text(degreeLabel, 0, nameY + 30, { width: W, align: 'center' });

      let contentY = nameY + 56;

      // Semester line (shown when cert is per-semester)
      if (certData.semester != null) {
        const semText = `Semester ${certData.semester}${certData.sgpa ? '  ·  SGPA: ' + certData.sgpa : ''}`;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(GOLD)
          .text(semText, 0, contentY, { width: W, align: 'center' });
        contentY += 17;
      }

      // CGPA
      if (certData.cgpa != null && certData.cgpa !== '') {
        doc.font('Times-Italic').fontSize(11).fillColor(GRAY)
          .text(`with a CGPA of ${certData.cgpa}`, 0, contentY, { width: W, align: 'center' });
        contentY += 17;
      }

      // University + year
      doc.font('Times-Roman').fontSize(11).fillColor('#444444')
        .text(
          `${certData.universityName || ''}${certData.city ? ', ' + certData.city : ''} — ${certData.graduationYear || new Date().getFullYear()}`,
          0, contentY, { width: W, align: 'center' }
        );
      contentY += 16;

      // ── 6. SUBJECTS TABLE ────────────────────────────────────────────────────
      const FOOTER_Y = H - 108;
      const TBL_L  = 80;
      const TBL_W  = W - 160;

      if (hasSubjects) {
        const TABLE_TOP = contentY + 14;

        // Thin divider rule
        doc.moveTo(TBL_L, TABLE_TOP).lineTo(TBL_L + TBL_W, TABLE_TOP)
          .lineWidth(0.5).strokeColor('#cccccc').stroke();

        // Section label + SGPA
        const secLabel = certData.semester != null
          ? `SEMESTER ${certData.semester}  —  SUBJECT MARKS`
          : 'ACADEMIC RECORD  —  SUBJECT MARKS';
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NAVY)
          .text(secLabel, TBL_L, TABLE_TOP + 7, { characterSpacing: 1.5, lineBreak: false });

        if (certData.sgpa != null) {
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GOLD)
            .text(`SGPA: ${certData.sgpa}`, TBL_L + TBL_W, TABLE_TOP + 7, { width: 0, align: 'right', lineBreak: false });
        }

        // Column X positions
        const CX_CODE  = TBL_L;
        const CX_NAME  = TBL_L + 95;
        const CX_MARKS = TBL_L + TBL_W - 165;
        const CX_GRADE = TBL_L + TBL_W - 75;

        // Table header row
        const TH = TABLE_TOP + 26;
        const ROW_H = 16;

        doc.rect(TBL_L, TH, TBL_W, 18).fill(NAVY);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE)
          .text('CODE',         CX_CODE  + 5, TH + 5, { width: 85, lineBreak: false })
          .text('SUBJECT NAME', CX_NAME  + 5, TH + 5, { width: CX_MARKS - CX_NAME - 10, lineBreak: false })
          .text('MARKS',        CX_MARKS + 5, TH + 5, { width: 80, lineBreak: false })
          .text('GRADE',        CX_GRADE + 5, TH + 5, { width: 65, lineBreak: false });

        // Data rows — cap at what fits before the footer
        const MAX_ROWS = Math.min(subjects.length, Math.floor((FOOTER_Y - TH - 20 - 10) / ROW_H));
        let rowY = TH + 18;

        for (let i = 0; i < MAX_ROWS; i++) {
          const sub = subjects[i];
          doc.rect(TBL_L, rowY, TBL_W, ROW_H).fill(i % 2 === 0 ? '#f4f4f4' : WHITE);

          const code  = String(sub.code || sub.subjectCode || `S${String(i + 1).padStart(2, '0')}`);
          const name  = String(sub.name || sub.subjectName || sub.subject || '—');
          const marks = sub.marks != null ? String(sub.marks) : '—';
          const grade = sub.grade || gradeFromMarks(sub.marks);

          doc.font('Courier').fontSize(8).fillColor(NAVY)
            .text(code, CX_CODE + 5, rowY + 3, { width: 85, lineBreak: false });
          doc.font('Helvetica').fontSize(8).fillColor('#2d2d2d')
            .text(name, CX_NAME + 5, rowY + 3, { width: CX_MARKS - CX_NAME - 10, lineBreak: false, ellipsis: true });
          doc.font('Helvetica-Bold').fontSize(8).fillColor(NAVY)
            .text(marks, CX_MARKS + 5, rowY + 3, { width: 80, lineBreak: false });
          doc.font('Helvetica').fontSize(8).fillColor(GRAY)
            .text(grade, CX_GRADE + 5, rowY + 3, { width: 65, lineBreak: false });
          rowY += ROW_H;
        }

        // Table outer border
        doc.rect(TBL_L, TH, TBL_W, 18 + MAX_ROWS * ROW_H)
          .lineWidth(0.5).strokeColor('#c0c0c0').stroke();

        // Column divider lines
        for (const cx of [CX_NAME, CX_MARKS, CX_GRADE]) {
          doc.moveTo(cx, TH).lineTo(cx, TH + 18 + MAX_ROWS * ROW_H)
            .lineWidth(0.3).strokeColor('#d0d0d0').stroke();
        }

        if (subjects.length > MAX_ROWS) {
          doc.font('Helvetica').fontSize(7).fillColor(GRAY)
            .text(`… and ${subjects.length - MAX_ROWS} more subject(s) not shown`, TBL_L, rowY + 3);
        }
      }

      // ── 7. FOOTER ROW ────────────────────────────────────────────────────────
      doc.moveTo(70, FOOTER_Y + 40).lineTo(220, FOOTER_Y + 40)
        .lineWidth(0.8).dash(3, { space: 2 }).strokeColor(NAVY).stroke().undash();
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text('Examination Controller', 70, FOOTER_Y + 46, { width: 150, align: 'center' });

      const QR_SIZE = 64;
      const qrImage = await QRCode.toDataURL(verifyUrl, { margin: 1, color: { dark: NAVY, light: '#ffffff' } });
      doc.image(qrImage, CENTER_X - QR_SIZE / 2, FOOTER_Y + 6, { width: QR_SIZE, height: QR_SIZE });
      doc.font('Helvetica').fontSize(7).fillColor(GRAY)
        .text('Scan to Verify', CENTER_X - 32, FOOTER_Y + QR_SIZE + 10, { width: 64, align: 'center' });

      doc.moveTo(W - 220, FOOTER_Y + 40).lineTo(W - 70, FOOTER_Y + 40)
        .lineWidth(0.8).dash(3, { space: 2 }).strokeColor(NAVY).stroke().undash();
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text('Registrar', W - 220, FOOTER_Y + 46, { width: 150, align: 'center' });

      // ── 8. SECURITY STRIP ────────────────────────────────────────────────────
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
