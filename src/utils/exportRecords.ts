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
  primary: [79, 140, 255] as [number, number, number],       // azul principal
  primaryLight: [235, 242, 255] as [number, number, number],
  cyan: [34, 211, 238] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],             // slate-900
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  successLight: [220, 252, 231] as [number, number, number],
  warningLight: [254, 243, 199] as [number, number, number],
};

const drawHeader = (doc: jsPDF, pageWidth: number): void => {
  // Fondo degradado simulado con rectángulos
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Acento lateral izquierdo
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 4, 42, 'F');

  // Logo / Icono placeholder (círculo con M)
  doc.setFillColor(...COLORS.primary);
  doc.circle(22, 21, 11, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MB', 22, 25.5, { align: 'center' });

  // Título app
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('MindBalance', 40, 18);

  // Subtítulo
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.cyan);
  doc.text('Historial de Registros TCC — Terapia Cognitivo-Conductual', 40, 27);

  // Fecha de exportación (derecha)
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate200);
  doc.text(
    `Exportado: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    pageWidth - 14,
    27,
    { align: 'right' }
  );
};

const drawFooter = (doc: jsPDF, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number): void => {
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.slate500);
  doc.text('MindBalance · Exportación confidencial', 14, pageHeight - 5);
  doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
};

const drawSectionLabel = (doc: jsPDF, label: string, x: number, y: number): void => {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.cyan);
  doc.text(label.toUpperCase(), x, y);
};

const drawBodyText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number => {
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.slate700);
  const lines = doc.splitTextToSize(text || '—', maxWidth);
  doc.text(lines, x, y);
  return lines.length * 5.5;
};

export const exportToPDF = (records: CbtRecord[]): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ── PORTADA ────────────────────────────────────────────────────────────────
  drawHeader(doc, pageWidth);

  // Panel de resumen
  const summaryY = 54;
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(margin, summaryY, contentWidth, 28, 4, 4, 'F');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Resumen del Historial', margin + 8, summaryY + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.slate700);
  doc.text(`Total de registros: ${records.length}`, margin + 8, summaryY + 19);

  if (records.length > 0) {
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const avgIntensity = Math.round(records.reduce((acc, r) => acc + r.q5_intensity, 0) / records.length);
    doc.text(`Período: ${formatDateShort(sorted[0].date)} — ${formatDateShort(sorted[sorted.length - 1].date)}`, margin + 8, summaryY + 25);
    doc.text(`Intensidad promedio: ${avgIntensity}%`, pageWidth / 2 + 10, summaryY + 19);
  }

  // Tabla de índice/resumen
  const tableStartY = summaryY + 36;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Tabla de Registros', margin, tableStartY);

  const tableData = records.map((r, idx) => [
    String(idx + 1),
    formatDateShort(r.date),
    r.q1_whatHappened.length > 55 ? r.q1_whatHappened.slice(0, 55) + '…' : r.q1_whatHappened,
    getTopEmotions(r.q4_emotions).split(' · ').slice(0, 2).join(' · ') || '—',
    `${r.q5_intensity}%`,
  ]);

  autoTable(doc, {
    startY: tableStartY + 5,
    head: [['#', 'Fecha', 'Situación', 'Emociones principales', 'Malestar']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      textColor: COLORS.slate700,
      lineColor: COLORS.slate200,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: COLORS.dark,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 52 },
      4: { cellWidth: 20, halign: 'center' },
    },
    didDrawPage: (data) => {
      drawHeader(doc, pageWidth);
      drawFooter(doc, data.pageNumber, 1, pageWidth, pageHeight);
    },
  });

  // ── DETALLE DE CADA REGISTRO ───────────────────────────────────────────────
  records.forEach((record, idx) => {
    doc.addPage();
    drawHeader(doc, pageWidth);

    let y = 52;

    // Número de registro + fecha
    const intensityColor = record.q5_intensity >= 70 ? COLORS.warning : COLORS.success;
    const intensityBgColor = record.q5_intensity >= 70 ? COLORS.warningLight : COLORS.successLight;

    // Badge número
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y, 24, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text(`Registro ${idx + 1}`, margin + 12, y + 7, { align: 'center' });

    // Fecha
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(formatDate(record.date), margin + 29, y + 7);

    // Badge intensidad (derecha)
    doc.setFillColor(...intensityBgColor);
    doc.roundedRect(pageWidth - margin - 32, y, 32, 10, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...intensityColor);
    doc.text(`Malestar: ${record.q5_intensity}%`, pageWidth - margin - 16, y + 7, { align: 'center' });

    y += 16;

    // Línea divisoria
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    // ── Pregunta 1
    drawSectionLabel(doc, '1. Situación — ¿Qué ocurrió?', margin, y);
    y += 5;
    y += drawBodyText(doc, record.q1_whatHappened, margin, y, contentWidth);
    y += 6;

    // ── Pregunta 2
    drawSectionLabel(doc, '2. Observaciones Directas (Hechos)', margin, y);
    y += 5;
    if (record.q2_directObservation.length > 0) {
      record.q2_directObservation.forEach((obs) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.slate700);
        doc.text(`• ${obs}`, margin + 3, y);
        y += 5.5;
      });
    } else {
      y += drawBodyText(doc, '—', margin, y, contentWidth);
    }
    y += 4;

    // ── Pregunta 3
    drawSectionLabel(doc, '3. Pensamiento Automático', margin, y);
    y += 5;
    // Fondo especial para el pensamiento
    const thoughtLines = doc.splitTextToSize(`"${record.q3_automaticThought}"`, contentWidth - 10);
    const thoughtH = thoughtLines.length * 5.5 + 8;
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(margin, y - 2, contentWidth, thoughtH, 3, 3, 'F');
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y - 2, 3, thoughtH, 'F');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.dark);
    doc.text(thoughtLines, margin + 7, y + 4);
    y += thoughtH + 6;

    // ── Pregunta 4 — Emociones (tabla compacta)
    drawSectionLabel(doc, '4. Emociones e Intensidad', margin, y);
    y += 5;

    const emotionEntries = Object.entries(record.q4_emotions).filter(([, v]) => v > 0);
    if (emotionEntries.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Emoción', 'Intensidad', 'Emoción', 'Intensidad']],
        body: (() => {
          const rows: string[][] = [];
          for (let i = 0; i < emotionEntries.length; i += 2) {
            const left = emotionEntries[i];
            const right = emotionEntries[i + 1];
            rows.push([
              left[0].charAt(0).toUpperCase() + left[0].slice(1),
              `${left[1]}%`,
              right ? right[0].charAt(0).toUpperCase() + right[0].slice(1) : '',
              right ? `${right[1]}%` : '',
            ]);
          }
          return rows;
        })(),
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
          textColor: COLORS.slate700,
        },
        headStyles: {
          fillColor: COLORS.slate700,
          textColor: COLORS.white,
          fontSize: 8,
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
        columnStyles: {
          1: { halign: 'center', fontStyle: 'bold' },
          3: { halign: 'center', fontStyle: 'bold' },
        },
        tableWidth: contentWidth,
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 1 || data.column.index === 3)) {
            const val = parseInt(String(data.cell.raw));
            if (!isNaN(val)) {
              data.cell.styles.textColor = val >= 70 ? COLORS.warning : COLORS.success;
            }
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    } else {
      y += drawBodyText(doc, 'Sin emociones registradas', margin, y, contentWidth);
      y += 4;
    }

    // ── Columnas: Evidencias (lado a lado)
    const colW = (contentWidth - 6) / 2;

    drawSectionLabel(doc, '6. Evidencia a Favor del Pensamiento', margin, y);
    drawSectionLabel(doc, '7. Evidencia en Contra del Pensamiento', margin + colW + 6, y);
    y += 5;

    const favLines = doc.splitTextToSize(record.q6_supportingEvidence || '—', colW - 4);
    const contraLines = doc.splitTextToSize(record.q7_opposingEvidence || '—', colW - 4);
    const maxLines = Math.max(favLines.length, contraLines.length);
    const colH = maxLines * 5.5 + 10;

    doc.setFillColor(255, 240, 240);
    doc.roundedRect(margin, y - 2, colW, colH, 3, 3, 'F');
    doc.setFillColor(240, 255, 245);
    doc.roundedRect(margin + colW + 6, y - 2, colW, colH, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.slate700);
    doc.text(favLines, margin + 4, y + 4);
    doc.text(contraLines, margin + colW + 10, y + 4);
    y += colH + 6;

    // ── Pregunta 8
    drawSectionLabel(doc, '8. Explicaciones Alternativas', margin, y);
    y += 5;
    if (record.q8_alternativeExplanations.length > 0) {
      record.q8_alternativeExplanations.forEach((exp) => {
        const expLines = doc.splitTextToSize(`• ${exp}`, contentWidth - 4);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.slate700);
        doc.text(expLines, margin + 3, y);
        y += expLines.length * 5.5;
      });
    } else {
      y += drawBodyText(doc, '—', margin, y, contentWidth);
    }
    y += 4;

    // ── Pregunta 9 — Pensamiento equilibrado (destacado)
    drawSectionLabel(doc, '9. Pensamiento Equilibrado', margin, y);
    y += 5;
    const balLines = doc.splitTextToSize(record.q9_balancedExplanation || '—', contentWidth - 10);
    const balH = balLines.length * 5.5 + 10;
    doc.setFillColor(...COLORS.successLight);
    doc.roundedRect(margin, y - 2, contentWidth, balH, 3, 3, 'F');
    doc.setFillColor(...COLORS.success);
    doc.rect(margin, y - 2, 3, balH, 'F');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(balLines, margin + 7, y + 4);
    y += balH + 6;

    // ── Pregunta 10
    drawSectionLabel(doc, '10. Aprendizaje Clave', margin, y);
    y += 5;
    y += drawBodyText(doc, record.q10_whatLearned, margin, y, contentWidth);

    // Footer de la página
    drawFooter(doc, idx + 2, records.length + 1, pageWidth, pageHeight);
  });

  // Actualizar números de página correctos en portada
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, pageWidth, pageHeight);
  }

  doc.save(buildFilename('pdf'));
};
