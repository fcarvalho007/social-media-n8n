import jsPDF from "jspdf";

interface ReportPDFOptions {
  title: string;
  subtitle?: string;
  content: string;
  generatedAt?: Date;
}

/**
 * Converts Markdown content to PDF
 */
export function generateReportPDF(options: ReportPDFOptions): Blob {
  const { title, subtitle, content, generatedAt = new Date() } = options;
  
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // Helper: add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Header
  pdf.setFillColor(139, 92, 246); // primary purple
  pdf.rect(0, 0, pageWidth, 35, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, margin, 18);
  
  if (subtitle) {
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(subtitle, margin, 26);
  }
  
  pdf.setFontSize(9);
  pdf.text(`Gerado: ${generatedAt.toLocaleString("pt-PT")}`, pageWidth - margin - 50, 26);
  
  currentY = 45;

  // Process markdown content
  const lines = content.split("\n");
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines but add spacing
    if (!trimmedLine) {
      currentY += 4;
      continue;
    }

    // Headers
    if (trimmedLine.startsWith("### ")) {
      checkPageBreak(12);
      pdf.setTextColor(139, 92, 246);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      const text = cleanMarkdown(trimmedLine.substring(4));
      pdf.text(text, margin, currentY);
      currentY += 8;
      continue;
    }

    if (trimmedLine.startsWith("## ")) {
      checkPageBreak(14);
      currentY += 4;
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      const text = cleanMarkdown(trimmedLine.substring(3));
      pdf.text(text, margin, currentY);
      currentY += 10;
      continue;
    }

    if (trimmedLine.startsWith("# ")) {
      checkPageBreak(16);
      currentY += 6;
      pdf.setTextColor(67, 56, 202);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      const text = cleanMarkdown(trimmedLine.substring(2));
      pdf.text(text, margin, currentY);
      currentY += 12;
      continue;
    }

    // Bullet points
    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      checkPageBreak(8);
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      const bulletText = cleanMarkdown(trimmedLine.substring(2));
      const wrappedLines = pdf.splitTextToSize(`• ${bulletText}`, contentWidth - 5);
      
      for (const wLine of wrappedLines) {
        checkPageBreak(6);
        pdf.text(wLine, margin + 3, currentY);
        currentY += 5;
      }
      currentY += 2;
      continue;
    }

    // Numbered lists
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      checkPageBreak(8);
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      const num = numberedMatch[1];
      const text = cleanMarkdown(numberedMatch[2]);
      const wrappedLines = pdf.splitTextToSize(`${num}. ${text}`, contentWidth - 5);
      
      for (const wLine of wrappedLines) {
        checkPageBreak(6);
        pdf.text(wLine, margin + 3, currentY);
        currentY += 5;
      }
      currentY += 2;
      continue;
    }

    // Horizontal rule
    if (trimmedLine === "---" || trimmedLine === "***") {
      checkPageBreak(8);
      currentY += 4;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;
      continue;
    }

    // Regular paragraph
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    
    const cleanText = cleanMarkdown(trimmedLine);
    const wrappedLines = pdf.splitTextToSize(cleanText, contentWidth);
    
    for (const wLine of wrappedLines) {
      checkPageBreak(6);
      pdf.text(wLine, margin, currentY);
      currentY += 5;
    }
    currentY += 2;
  }

  // Footer on last page
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    "Gerado por Social Media Analytics • " + new Date().getFullYear(),
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  return pdf.output("blob");
}

/**
 * Removes markdown formatting from text
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/`(.+?)`/g, "$1") // code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .trim();
}
