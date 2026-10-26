import jsPDF from 'jspdf';

export type PdfTable = { titulo: string; colunas: string[]; linhas: Array<Array<string | number>> };
export type PdfMetric = { label: string; value: string | number; sub?: string };

function valorPdf(valor: unknown) {
  if (valor === null || valor === undefined || valor === '') return '-';
  return String(valor);
}

export function criarPdfRelatorio({
  titulo,
  usuario,
  filtros,
  metricas,
  tabelas,
}: {
  titulo: string;
  usuario?: any;
  filtros: string[];
  metricas: PdfMetric[];
  tabelas: PdfTable[];
}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedAt = new Date();
  let y = margin;

  const addFooter = () => {
    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Gerado em ${generatedAt.toLocaleDateString('pt-PT')} as ${generatedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, margin, pageHeight - 8);
      pdf.text(`Pagina ${page} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 20) return;
    pdf.addPage();
    y = margin;
  };

  const writeWrapped = (text: string, x: number, top: number, width: number, lineHeight = 4) => {
    const lines = pdf.splitTextToSize(text, width);
    pdf.text(lines, x, top);
    return lines.length * lineHeight;
  };

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 34, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text(titulo, margin, 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Sistema SOSTicket', margin, 24);
  pdf.text(usuario?.nome || usuario?.email || 'Utilizador', pageWidth - margin, 16, { align: 'right' });
  y = 44;

  if (filtros.length) {
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(9);
    filtros.forEach((filtro) => {
      ensureSpace(5);
      pdf.text(filtro, margin, y);
      y += 5;
    });
    y += 4;
  }

  if (metricas.length) {
    const gap = 4;
    const columns = metricas.length >= 4 ? 4 : Math.max(metricas.length, 1);
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    metricas.forEach((metrica, index) => {
      const col = index % columns;
      const rowTop = y + Math.floor(index / columns) * 28;
      if (col === 0) ensureSpace(28);
      const x = margin + col * (cardWidth + gap);
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, rowTop, cardWidth, 22, 2, 2, 'FD');
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text(metrica.label.toUpperCase(), x + 4, rowTop + 6);
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(12);
      pdf.text(valorPdf(metrica.value), x + 4, rowTop + 13);
      if (metrica.sub) {
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text(metrica.sub, x + 4, rowTop + 18);
      }
      if (col === columns - 1 || index === metricas.length - 1) {
        y = rowTop + 28;
      }
    });
  }

  tabelas.forEach((tabela) => {
    ensureSpace(24);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(tabela.titulo, margin, y);
    y += 8;

    const colWidth = contentWidth / tabela.colunas.length;
    const drawHeader = () => {
      pdf.setFillColor(241, 245, 249);
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, y, contentWidth, 8, 'FD');
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      tabela.colunas.forEach((coluna, index) => {
        writeWrapped(coluna, margin + index * colWidth + 2, y + 5, colWidth - 4, 3);
      });
      y += 8;
    };

    drawHeader();
    const linhas = tabela.linhas.length ? tabela.linhas : [['Sem dados']];
    linhas.forEach((linha) => {
      const cellLines = linha.map((cell) => pdf.splitTextToSize(valorPdf(cell), colWidth - 4));
      const rowHeight = Math.max(8, ...cellLines.map((lines) => lines.length * 3.5 + 4));
      ensureSpace(rowHeight + 2);
      if (y === margin) drawHeader();
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, y, contentWidth, rowHeight, 'S');
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      linha.forEach((cell, index) => {
        pdf.text(pdf.splitTextToSize(valorPdf(cell), colWidth - 4), margin + index * colWidth + 2, y + 5);
      });
      y += rowHeight;
    });
    y += 8;
  });

  addFooter();
  return pdf;
}
