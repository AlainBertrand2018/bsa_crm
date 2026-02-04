
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Quotation, Invoice, DocumentItem, BusinessDetails } from './types';
import { COMPANY_DETAILS, VAT_RATE } from './constants';
import { formatCurrency, formatDate } from './utils';

// Extend jsPDF with autoTable, otherwise TypeScript might complain
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const addDocumentHeader = (
  doc: jsPDF,
  type: 'Quotation' | 'Invoice' | 'Receipt' | 'Statement',
  document: any,
  businessDetails?: BusinessDetails
) => {
  const name = String(businessDetails?.businessName || COMPANY_DETAILS.name || 'N/A');
  const brn = String(businessDetails?.brn || COMPANY_DETAILS.brn || 'N/A');
  const vat = businessDetails?.vatNo || COMPANY_DETAILS.vat;
  const address = String(businessDetails?.businessAddress || COMPANY_DETAILS.address || 'N/A');
  const tel = String(businessDetails?.telephone || COMPANY_DETAILS.tel || 'N/A');
  const email = String(businessDetails?.email || COMPANY_DETAILS.email || 'N/A');
  const website = businessDetails?.website || COMPANY_DETAILS.url;

  const pageWidth = doc.internal.pageSize.getWidth();

  // Highlight bar at top
  doc.setFillColor(0, 102, 204);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Company Details (Left)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(name, 14, 25);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`BRN: ${brn}`, 14, 32);
  if (vat) doc.text(`VAT: ${vat}`, 60, 32);

  doc.text(address, 14, 37);
  doc.text(`Tel: ${tel} | Email: ${email}`, 14, 42);
  if (website) {
    doc.text(`Website: ${website}`, 14, 47);
  }

  // Document Type and Details (Right)
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 204); // Primary color
  doc.text(type.toUpperCase(), pageWidth - 14, 25, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`${type} ID: ${document.id || document.receiptId || 'N/A'}`, pageWidth - 14, 35, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  const dateLabel = type === 'Quotation' ? 'Date' : (type === 'Invoice' ? 'Date Issued' : 'Date');
  const dateValue = document.quotationDate || document.invoiceDate || document.date || document.createdAt;
  doc.text(`${dateLabel}: ${formatDate(dateValue)}`, pageWidth - 14, 40, { align: 'right' });

  if (type === 'Quotation') {
    doc.text(`Valid Until: ${formatDate(document.expiryDate)}`, pageWidth - 14, 45, { align: 'right' });
  } else if (type === 'Invoice') {
    doc.text(`Due Date: ${formatDate(document.dueDate)}`, pageWidth - 14, 45, { align: 'right' });
    if (document.quotationId || document.quotation_id) {
      doc.text(`Ref: ${document.quotationId || document.quotation_id}`, pageWidth - 14, 50, { align: 'right' });
    }
  }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, 55, pageWidth - 14, 55); // Horizontal line
  return 65; // Starting Y for next section
};

const addClientDetails = (doc: jsPDF, yPos: number, document: Quotation | Invoice) => {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Bill To:', 14, yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  let currentY = yPos + 6;
  doc.text(String(document.clientName || 'N/A'), 14, currentY);
  currentY += 5;
  if (document.clientCompany) {
    doc.text(String(document.clientCompany), 14, currentY);
    currentY += 5;
  }
  doc.text(`Email: ${document.clientEmail}`, 14, currentY);
  currentY += 5;
  if (document.clientPhone) {
    doc.text(`Phone: ${document.clientPhone}`, 14, currentY);
    currentY += 5;
  }
  if (document.clientAddress) {
    // Handle multi-line address if necessary
    const addressLines = doc.splitTextToSize(document.clientAddress, doc.internal.pageSize.getWidth() / 2 - 28);
    doc.text(addressLines, 14, currentY);
    currentY += (addressLines.length * 5);
  }
  if (document.clientBRN) {
    doc.text(`BRN: ${document.clientBRN}`, 14, currentY);
    currentY += 5;
  }
  return currentY + 5; // Starting Y for next section
};

const addItemsTable = (doc: jsPDF, yPos: number, items: DocumentItem[], currency: string) => {
  const tableColumn = ["Item Description", "Quantity", "Unit Price", "Total"];
  const tableRows: any[][] = [];

  items.forEach(item => {
    const itemData = [
      item.description || "Unknown Item",
      item.quantity,
      formatCurrency(item.unitPrice, currency),
      formatCurrency(item.total, currency),
    ];
    tableRows.push(itemData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: yPos,
    theme: 'grid', // 'striped', 'grid', 'plain'
    headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' }, // Teal header
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    didDrawPage: (data: any) => {
      // You can add headers/footers to each page if the table spans multiple pages
    }
  });

  return (doc as any).lastAutoTable.finalY + 10; // Starting Y for next section
};

const addTotals = (doc: jsPDF, yPos: number, document: Quotation | Invoice) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightAlignX = pageWidth - 14;
  const labelX = rightAlignX - 50;
  let currentY = yPos;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  doc.text('Subtotal:', labelX, currentY, { align: 'left' });
  doc.text(formatCurrency(document.subTotal, document.currency), rightAlignX, currentY, { align: 'right' });
  currentY += 7;

  if ((document.discount || 0) > 0) {
    doc.setTextColor(200, 0, 0); // Red for discount
    doc.text('Discount:', labelX, currentY, { align: 'left' });
    doc.text(`-${formatCurrency(document.discount!, document.currency)}`, rightAlignX, currentY, { align: 'right' });
    doc.setTextColor(50, 50, 50);
    currentY += 7;
  }

  const amountBeforeVat = Math.max(0, document.subTotal - (document.discount || 0));
  doc.text('Amount before VAT:', labelX, currentY, { align: 'left' });
  doc.text(formatCurrency(amountBeforeVat, document.currency), rightAlignX, currentY, { align: 'right' });
  currentY += 7;

  doc.text(`VAT (${VAT_RATE * 100}%):`, labelX, currentY, { align: 'left' });
  doc.text(formatCurrency(document.vatAmount, document.currency), rightAlignX, currentY, { align: 'right' });
  currentY += 7;

  doc.setLineWidth(0.3);
  doc.line(labelX - 2, currentY - 3, rightAlignX, currentY - 3);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 204); // Primary color for grand total
  doc.text('Grand Total:', labelX, currentY + 4, { align: 'left' });
  doc.text(formatCurrency(document.grandTotal, document.currency), rightAlignX, currentY + 4, { align: 'right' });

  return currentY + 15;
};

const addNotesAndFooter = (doc: jsPDF, yPos: number, document: Quotation | Invoice, type: 'Quotation' | 'Invoice') => {
  let currentY = yPos;
  const pageWidth = doc.internal.pageSize.getWidth();

  if (document.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Notes:', 14, currentY);
    currentY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const notesLines = doc.splitTextToSize(document.notes, pageWidth - 28);
    doc.text(notesLines, 14, currentY);
    currentY += (notesLines.length * 5) + 10;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);

  const thankYouText = type === 'Quotation'
    ? `Thank you for your business! This quotation is valid until ${formatDate((document as Quotation).expiryDate)}.`
    : `Please make payment by ${formatDate((document as Invoice).dueDate)}.`;

  doc.text(thankYouText, 14, pageHeight - 15);
  doc.text(`All prices are in ${document.currency}.`, 14, pageHeight - 10);

  const pdfFooterText = "Generated by BSA CRM Systems \u2022 \u00A9 2026 Business Studio AI (BSA) - Alain BERTRAND All rights reserved.";
  const textWidth = doc.getStringUnitWidth(pdfFooterText) * doc.getFontSize() / doc.internal.scaleFactor;
  const textX = (pageWidth - textWidth) / 2; // Center align

  doc.text(pdfFooterText, textX, pageHeight - 5);


  return currentY;
};


export const generatePdfDocument = (
  document: Quotation | Invoice,
  type: 'Quotation' | 'Invoice',
  businessDetails?: BusinessDetails
): void => {
  const doc = new jsPDF();

  let yPos = addDocumentHeader(doc, type, document, businessDetails);
  yPos = addClientDetails(doc, yPos, document);
  yPos = addItemsTable(doc, yPos, document.items, document.currency);
  yPos = addTotals(doc, yPos, document);
  addNotesAndFooter(doc, yPos, document, type);

  doc.save(`${type}_${document.id.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

export const generateReceiptPdf = (
  receipt: any,
  businessDetails?: BusinessDetails
): void => {
  const doc = new jsPDF();
  const type = 'Receipt';

  let yPos = addDocumentHeader(doc, type, receipt, businessDetails);

  // Bill To / Received From
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Received From:', 14, yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(String(receipt.clientName || 'N/A'), 14, yPos + 6);
  if (receipt.clientCompany) {
    doc.text(String(receipt.clientCompany), 14, yPos + 11);
  }

  yPos += 25;

  doc.autoTable({
    head: [['Description', 'Payment Method', 'Amount']],
    body: [
      [
        `Payment for Invoice ${receipt.invoiceNumber || receipt.invoice_id || 'N/A'}`,
        receipt.paymentMethod || receipt.payment_method || 'N/A',
        formatCurrency(receipt.amount, receipt.currency || 'MUR')
      ]
    ],
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 204);
  doc.text('Total Received:', 14, yPos);
  doc.text(formatCurrency(receipt.amount, receipt.currency || 'MUR'), 180, yPos, { align: 'right' });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your payment. This is a computer generated receipt.", 14, pageHeight - 15);

  const pdfFooterText = "Generated by BSA CRM Systems \u2022 \u00A9 2026 Business Studio AI (BSA) - Alain BERTRAND All rights reserved.";
  const textWidth = doc.getStringUnitWidth(pdfFooterText) * doc.getFontSize() / doc.internal.scaleFactor;
  const textX = (pageWidth - textWidth) / 2;
  doc.text(pdfFooterText, textX, pageHeight - 5);

  doc.save(`Receipt_${(receipt.id || 'R').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

export const generateStatementPdf = (
  statement: any,
  businessDetails?: BusinessDetails
): void => {
  const doc = new jsPDF();
  const type = 'Statement';

  let yPos = addDocumentHeader(doc, type, statement, businessDetails);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Statement For:', 14, yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(String(statement.clientName || 'N/A'), 14, yPos + 6);
  if (statement.clientEmail) doc.text(String(statement.clientEmail), 14, yPos + 11);
  doc.text(`Period: ${statement.period || 'All Time'}`, 14, yPos + 16);

  yPos += 25;

  // If statement has multiple invoices, we could list them here.
  // For now, it's a summary statement.
  doc.autoTable({
    head: [['Date', 'Description', 'Due Date', 'Status', 'Balance']],
    body: [
      [
        formatDate(statement.date),
        'Account Statement Summary',
        formatDate(statement.dueDate || statement.date),
        statement.status || 'Pending',
        formatCurrency(statement.amount, 'MUR')
      ]
    ],
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 0, 0); // Red for outstanding amount
  doc.text('Total Outstanding:', 14, yPos);
  doc.text(formatCurrency(statement.amount, 'MUR'), 180, yPos, { align: 'right' });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text("Please settle the outstanding balance at your earliest convenience.", 14, pageHeight - 15);

  const pdfFooterText = "Generated by BSA CRM Systems \u2022 \u00A9 2026 Business Studio AI (BSA) - Alain BERTRAND All rights reserved.";
  const textWidth = doc.getStringUnitWidth(pdfFooterText) * doc.getFontSize() / doc.internal.scaleFactor;
  const textX = (pageWidth - textWidth) / 2;
  doc.text(pdfFooterText, textX, pageHeight - 5);

  doc.save(`Statement_${(statement.id || 'S').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};
