import PDFDocument from 'pdfkit';

/**
 * Build a PDF buffer from resume builder profile (personal, professional, education, links).
 */
export function buildResumePdf(profile) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const personal = profile.personal || {};
    const professional = profile.professional || {};
    const education = profile.education || [];
    const links = profile.links || {};

    const primary = '#0f172a';
    const muted = '#64748b';

    doc.fontSize(22).fillColor(primary).font('Helvetica-Bold').text(personal.fullName || 'Your Name', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(primary).font('Helvetica').text(professional.currentTitle || '', { align: 'center' });
    doc.moveDown(0.5);

    const contactParts = [personal.email, personal.phone, personal.location].filter(Boolean);
    if (contactParts.length > 0) {
      doc.fontSize(10).fillColor(muted).text(contactParts.join('  ·  '), { align: 'center', lineGap: 2 });
      doc.moveDown(0.6);
    }
    const linkParts = [links.linkedin, links.github, links.portfolio].filter(Boolean);
    if (linkParts.length > 0) {
      doc.fontSize(9).fillColor(muted).text(linkParts.join('  ·  '), { align: 'center', lineGap: 2 });
      doc.moveDown(0.5);
    }
    doc.moveDown(1);

    doc.fontSize(11).fillColor(primary).font('Helvetica-Bold').text('Professional Summary', { underline: true });
    doc.moveDown(0.4);
    if (professional.summary) {
      doc.fontSize(10).fillColor(primary).font('Helvetica').text(professional.summary, { align: 'justify' });
    } else {
      doc.fontSize(10).fillColor(muted).font('Helvetica').text('Add your professional summary in the Resume Maker Content tab.', { align: 'left' });
    }
    doc.moveDown(1);

    const work = professional.workExperience || [];
    doc.fontSize(11).fillColor(primary).font('Helvetica-Bold').text('Experience', { underline: true });
    doc.moveDown(0.5);
    if (work.length > 0) {
      work.forEach((w) => {
        doc.fontSize(10).fillColor(primary).font('Helvetica-Bold').text(w.role || w.company || 'Role');
        doc.fontSize(9).fillColor(muted).text(`${w.company || ''}${w.period ? `  •  ${w.period}` : ''}`);
        doc.moveDown(0.3);
        if (w.description) {
          doc.fontSize(9).fillColor(primary).font('Helvetica').text(w.description, { align: 'justify' });
        }
        doc.moveDown(0.6);
      });
    } else {
      doc.fontSize(10).fillColor(muted).font('Helvetica').text('Add work experience in Profile or in the Resume Maker Content tab.', { align: 'left' });
    }
    doc.moveDown(0.3);

    doc.fontSize(11).fillColor(primary).font('Helvetica-Bold').text('Education', { underline: true });
    doc.moveDown(0.5);
    if (education.length > 0) {
      education.forEach((e) => {
        doc.fontSize(10).fillColor(primary).font('Helvetica-Bold').text(e.degree || e.institution || 'Education');
        doc.fontSize(9).fillColor(muted).text(`${e.institution || ''}${e.period || e.year ? `  •  ${e.period || e.year}` : ''}`);
        if (e.description) doc.fontSize(9).fillColor(primary).font('Helvetica').text(e.description);
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(10).fillColor(muted).font('Helvetica').text('Add education in Profile or in the Resume Maker Content tab.', { align: 'left' });
    }
    doc.moveDown(0.3);

    doc.fontSize(11).fillColor(primary).font('Helvetica-Bold').text('Skills', { underline: true });
    doc.moveDown(0.4);
    const skills = professional.skills || [];
    if (skills.length > 0) {
      doc.fontSize(9).fillColor(primary).font('Helvetica').text(skills.join('  •  '));
    } else {
      doc.fontSize(10).fillColor(muted).font('Helvetica').text('Add skills in the Resume Maker Content tab.', { align: 'left' });
    }

    doc.end();
  });
}
