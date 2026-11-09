import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CbtRecord } from '../services';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const getTopEmotions = (emotions: CbtRecord['q4_emotions']): string =>
  Object.entries(emotions)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}%`)
    .join(' · ') || '—';

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const buildFilename = (ext: string) => {
  const now = new Date().toISOString().slice(0, 10);
  return `MindBalance_Historial_${now}.${ext}`;
};

// ─── JSON ────────────────────────────────────────────────────────────────────

export const exportToJSON = (records: CbtRecord[]): void => {
  const payload = {
    exportDate: new Date().toISOString(),
    totalRecords: records.length,
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, buildFilename('json'));
};

// ─── CSV ─────────────────────────────────────────────────────────────────────

export const exportToCSV = (records: CbtRecord[]): void => {
  const headers = [
    'ID',
    'Fecha',
    'Situación (¿Qué ocurrió?)',
    'Observaciones Directas',
    'Pensamiento Automático',
    'Ansiedad (%)',
    'Miedo (%)',
    'Tristeza (%)',
    'Molestia (%)',
    'Vergüenza (%)',
    'Enojo (%)',
    'Malestar General (%)',
    'Evidencia a Favor',
    'Evidencia en Contra',
    'Explicaciones Alternativas',
    'Pensamiento Equilibrado',
    'Aprendizaje Clave',
  ];

  const escape = (val: unknown): string => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((r) => [
    escape(r.id),
    escape(formatDateShort(r.date)),
    escape(r.q1_whatHappened),
    escape(r.q2_directObservation.join('; ')),
    escape(r.q3_automaticThought),
    escape(r.q4_emotions.ansiedad),
    escape(r.q4_emotions.miedo),
    escape(r.q4_emotions.tristeza),
    escape(r.q4_emotions.molestia),
    escape(r.q4_emotions.verguenza),
    escape(r.q4_emotions.enojo),
    escape(r.q5_intensity),
    escape(r.q6_supportingEvidence),
    escape(r.q7_opposingEvidence),
    escape(r.q8_alternativeExplanations.join('; ')),
    escape(r.q9_balancedExplanation),
    escape(r.q10_whatLearned),
  ]);

  const csv =
    '\uFEFF' + // BOM para compatibilidad con Excel
    [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, buildFilename('csv'));
};

// ─── PDF ─────────────────────────────────────────────────────────────────────

// Paleta de colores
const COLORS = {
  primary:      [79, 140, 255]  as [number, number, number],
  primaryLight: [235, 242, 255] as [number, number, number],
  cyan:         [34, 211, 238]  as [number, number, number],
  dark:         [15, 23, 42]    as [number, number, number],
  slate700:     [51, 65, 85]    as [number, number, number],
  slate200:     [226, 232, 240] as [number, number, number],
  white:        [255, 255, 255] as [number, number, number],
  success:      [34, 197, 94]   as [number, number, number],
  warning:      [245, 158, 11]  as [number, number, number],
  successLight: [220, 252, 231] as [number, number, number],
  warningLight: [254, 243, 199] as [number, number, number],
};

const HEADER_H  = 42;   // altura del header en mm
const LINE_H    = 5.5;  // interlineado base en mm
const SECTION_GAP = 7;  // espacio entre secciones

/** Dibuja el header en la página actual */
const drawHeader = (doc: jsPDF, pageWidth: number): void => {
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, HEADER_H, 'F');

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 4, HEADER_H, 'F');

  doc.setFillColor(...COLORS.primary);
  doc.circle(22, 21, 11, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MB', 22, 25.5, { align: 'center' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('MindBalance', 40, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.cyan);
  doc.text('Historial de Registros TCC — Terapia Cognitivo-Conductual', 40, 27);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate200);
  doc.text(
    `Exportado: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    pageWidth - 14, 27, { align: 'right' }
  );
};

/** Clase auxiliar que gestiona la posición Y y abre nuevas páginas automáticamente */
class PageWriter {
  private doc: jsPDF;
  private pageWidth: number;
  private margin: number;
  public contentWidth: number;
  public y: number;
  private safeBottom: number; // límite inferior antes de saltar de página

  constructor(doc: jsPDF, pageWidth: number, _pageHeight: number, margin: number) {
    this.doc         = doc;
    this.pageWidth   = pageWidth;
    this.margin      = margin;
    this.contentWidth = pageWidth - margin * 2;
    this.y           = HEADER_H + 10;
    this.safeBottom  = _pageHeight - 12; // sin footer, margen mínimo inferior
  }

  /** Verifica si queda espacio; si no, agrega página y redibuja el header */
  check(neededMm: number): void {
    if (this.y + neededMm > this.safeBottom) {
      this.doc.addPage();
      drawHeader(this.doc, this.pageWidth);
      this.y = HEADER_H + 10;
    }
  }

  /** Escribe una etiqueta de sección en cian */
  sectionLabel(label: string): void {
    this.check(LINE_H + 2);
    this.doc.setFontSize(7.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.cyan);
    this.doc.text(label.toUpperCase(), this.margin, this.y);
    this.y += LINE_H;
  }

  /** Escribe texto partido en líneas */
  bodyText(text: string, indentX = 0, maxW?: number): void {
    const w = (maxW ?? this.contentWidth) - indentX;
    // font ANTES de splitTextToSize para que el cálculo sea correcto
    this.doc.setFontSize(9.5);
    this.doc.setFont('helvetica', 'normal');
    const lines: string[] = this.doc.splitTextToSize(text || '—', w);
    const totalH = lines.length * LINE_H;
    this.check(totalH);
    this.doc.setTextColor(...COLORS.slate700);
    this.doc.text(lines, this.margin + indentX, this.y);
    this.y += totalH;
  }

  /** Dibuja un bloque con fondo de color; maneja salto de página completo */
  colorBlock(
    text: string,
    bgColor: [number, number, number],
    accentColor: [number, number, number] | null,
    fontStyle: 'normal' | 'bold' | 'italic',
    textColor: [number, number, number],
    indentText = 7
  ): void {
    // font ANTES de splitTextToSize para que el cálculo sea correcto
    this.doc.setFontSize(9.5);
    this.doc.setFont('helvetica', fontStyle);
    const maxTextW = this.contentWidth - indentText - 6;
    const lines: string[] = this.doc.splitTextToSize(text || '—', maxTextW);
    const blockH = lines.length * LINE_H + 12;
    this.check(blockH);
    this.doc.setFillColor(...bgColor);
    this.doc.roundedRect(this.margin, this.y - 2, this.contentWidth, blockH, 3, 3, 'F');
    if (accentColor) {
      this.doc.setFillColor(...accentColor);
      this.doc.rect(this.margin, this.y - 2, 3, blockH, 'F');
    }
    this.doc.setTextColor(...textColor);
    this.doc.text(lines, this.margin + indentText, this.y + 5);
    this.y += blockH + 4;
  }

  /** Dibuja dos columnas de texto con fondo; maneja salto de página */
  twoColumns(
    leftText: string,
    rightText: string,
    leftBg: [number, number, number],
    rightBg: [number, number, number]
  ): void {
    const colW = (this.contentWidth - 6) / 2;
    // font ANTES de splitTextToSize para que el cálculo sea correcto
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    const leftLines: string[]  = this.doc.splitTextToSize(leftText || '—',  colW - 10);
    const rightLines: string[] = this.doc.splitTextToSize(rightText || '—', colW - 10);
    const rows = Math.max(leftLines.length, rightLines.length);
    const colH = rows * LINE_H + 12;
    this.check(colH);

    this.doc.setFillColor(...leftBg);
    this.doc.roundedRect(this.margin, this.y - 2, colW, colH, 3, 3, 'F');
    this.doc.setFillColor(...rightBg);
    this.doc.roundedRect(this.margin + colW + 6, this.y - 2, colW, colH, 3, 3, 'F');

    this.doc.setTextColor(...COLORS.slate700);
    this.doc.text(leftLines,  this.margin + 5,         this.y + 5);
    this.doc.text(rightLines, this.margin + colW + 11, this.y + 5);
    this.y += colH + 4;
  }

  gap(mm = SECTION_GAP): void {
    this.y += mm;
  }

  divider(): void {
    this.check(4);
    this.doc.setDrawColor(...COLORS.slate200);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 6;
  }
}

export const exportToPDF = (records: CbtRecord[]): void => {
  const doc        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin     = 14;
  const contentW   = pageWidth - margin * 2;

  // ── PORTADA ────────────────────────────────────────────────────────────────
  drawHeader(doc, pageWidth);

  let coverY = HEADER_H + 12;

  // Panel resumen
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(margin, coverY, contentW, 28, 4, 4, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Resumen del Historial', margin + 8, coverY + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.slate700);
  doc.text(`Total de registros: ${records.length}`, margin + 8, coverY + 19);

  if (records.length > 0) {
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const avg    = Math.round(records.reduce((acc, r) => acc + r.q5_intensity, 0) / records.length);
    doc.text(
      `Período: ${formatDateShort(sorted[0].date)} — ${formatDateShort(sorted[sorted.length - 1].date)}`,
      margin + 8, coverY + 25
    );
    doc.text(`Intensidad promedio: ${avg}%`, pageWidth / 2 + 10, coverY + 19);
  }

  coverY += 36;

  // Tabla índice
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Tabla de Registros', margin, coverY);

  const tableBody = records.map((r, i) => [
    String(i + 1),
    formatDateShort(r.date),
    r.q1_whatHappened.length > 55 ? r.q1_whatHappened.slice(0, 55) + '…' : r.q1_whatHappened,
    getTopEmotions(r.q4_emotions).split(' · ').slice(0, 2).join(' · ') || '—',
    `${r.q5_intensity}%`,
  ]);

  autoTable(doc, {
    startY: coverY + 5,
    head: [['#', 'Fecha', 'Situación', 'Emociones principales', 'Malestar']],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      textColor: COLORS.slate700,
      lineColor: COLORS.slate200,
      lineWidth: 0.3,
      overflow: 'linebreak',
    },
    headStyles: { fillColor: COLORS.dark, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 52 },
      4: { cellWidth: 20, halign: 'center' },
    },
    didDrawPage: () => drawHeader(doc, pageWidth),
  });

  // ── DETALLE DE CADA REGISTRO ───────────────────────────────────────────────
  records.forEach((record, idx) => {
    doc.addPage();
    drawHeader(doc, pageWidth);

    const pw = new PageWriter(doc, pageWidth, pageHeight, margin);
    pw.y = HEADER_H + 8;

    // ─ Cabecera del registro
    const iHigh    = record.q5_intensity >= 70;
    const iColor   = iHigh ? COLORS.warning      : COLORS.success;
    const iBgColor = iHigh ? COLORS.warningLight  : COLORS.successLight;

    pw.check(16);
    // Badge número
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, pw.y, 24, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text(`Registro ${idx + 1}`, margin + 12, pw.y + 7, { align: 'center' });

    // Fecha (truncada si es muy larga)
    const fechaStr = formatDate(record.date);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(fechaStr, margin + 29, pw.y + 7, { maxWidth: contentW - 70 });

    // Badge intensidad
    doc.setFillColor(...iBgColor);
    doc.roundedRect(pageWidth - margin - 32, pw.y, 32, 10, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...iColor);
    doc.text(`Malestar: ${record.q5_intensity}%`, pageWidth - margin - 16, pw.y + 7, { align: 'center' });

    pw.y += 14;
    pw.divider();

    // ─ Sección 1
    pw.sectionLabel('1. Situación — ¿Qué ocurrió?');
    pw.bodyText(record.q1_whatHappened);
    pw.gap();

    // ─ Sección 2
    pw.sectionLabel('2. Observaciones Directas (Hechos)');
    if (record.q2_directObservation.length > 0) {
      record.q2_directObservation.forEach(obs => {
        pw.bodyText(`• ${obs}`, 3);
      });
    } else {
      pw.bodyText('—');
    }
    pw.gap();

    // ─ Sección 3 — Pensamiento automático (bloque azul)
    pw.sectionLabel('3. Pensamiento Automático');
    pw.colorBlock(
      `"${record.q3_automaticThought}"`,
      COLORS.primaryLight,
      COLORS.primary,
      'italic',
      COLORS.dark
    );
    pw.gap(3);

    // ─ Sección 4 — Emociones (tabla compacta)
    pw.sectionLabel('4. Emociones e Intensidad');
    const emotionEntries = Object.entries(record.q4_emotions).filter(([, v]) => v > 0);
    if (emotionEntries.length > 0) {
      const emotionRows: string[][] = [];
      for (let i = 0; i < emotionEntries.length; i += 2) {
        const l = emotionEntries[i];
        const r = emotionEntries[i + 1];
        emotionRows.push([
          l[0].charAt(0).toUpperCase() + l[0].slice(1), `${l[1]}%`,
          r ? r[0].charAt(0).toUpperCase() + r[0].slice(1) : '',
          r ? `${r[1]}%` : '',
        ]);
      }
      // Estimar altura de la tabla y verificar espacio
      const estimatedH = emotionRows.length * 10 + 14;
      pw.check(estimatedH);
      autoTable(doc, {
        startY: pw.y,
        head: [['Emoción', 'Intensidad', 'Emoción', 'Intensidad']],
        body: emotionRows,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
          textColor: COLORS.slate700,
          overflow: 'linebreak',
        },
        headStyles: { fillColor: COLORS.slate700, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
        columnStyles: {
          1: { halign: 'center', fontStyle: 'bold' },
          3: { halign: 'center', fontStyle: 'bold' },
        },
        tableWidth: contentW,
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 1 || data.column.index === 3)) {
            const val = parseInt(String(data.cell.raw));
            if (!isNaN(val)) {
              data.cell.styles.textColor = val >= 70 ? COLORS.warning : COLORS.success;
            }
          }
        },
        didDrawPage: () => drawHeader(doc, pageWidth),
      });
      pw.y = (doc as any).lastAutoTable.finalY + 6;
    } else {
      pw.bodyText('Sin emociones registradas');
      pw.gap();
    }

    // ─ Secciones 6 y 7 — Evidencias en dos columnas
    pw.sectionLabel('6. Evidencia a Favor       |       7. Evidencia en Contra');
    pw.twoColumns(
      record.q6_supportingEvidence,
      record.q7_opposingEvidence,
      [255, 240, 240],
      [240, 255, 245]
    );
    pw.gap(3);

    // ─ Sección 8
    pw.sectionLabel('8. Explicaciones Alternativas');
    if (record.q8_alternativeExplanations.length > 0) {
      record.q8_alternativeExplanations.forEach(exp => pw.bodyText(`• ${exp}`, 3));
    } else {
      pw.bodyText('—');
    }
    pw.gap();

    // ─ Sección 9 — Pensamiento equilibrado (bloque verde)
    pw.sectionLabel('9. Pensamiento Equilibrado');
    pw.colorBlock(
      record.q9_balancedExplanation,
      COLORS.successLight,
      COLORS.success,
      'bold',
      [21, 128, 61]
    );
    pw.gap(3);

    // ─ Sección 10
    pw.sectionLabel('10. Aprendizaje Clave');
    pw.bodyText(record.q10_whatLearned);
  });

  doc.save(buildFilename('pdf'));
};
