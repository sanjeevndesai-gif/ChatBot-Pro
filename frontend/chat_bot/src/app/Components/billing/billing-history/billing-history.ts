import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingTableService } from './billing-table';
import { AuthService } from '../../../services/auth.service';
import { Invoice } from '../models/invoice.model';
import { jsPDF } from 'jspdf';   // ✅ Correct import for Angular + jsPDF

@Component({
  selector: 'app-billing-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './billing-history.html',
  styleUrls: ['./billing-history.scss']
})
export class BillingHistory {

  private billingService = inject(BillingTableService);
  authService = inject(AuthService);

  invoices = this.billingService.invoices;
  loading = this.billingService.loading;

  search = signal('');
  statusFilter = signal('');
  selectedInvoice = signal<Invoice | null>(null);

  constructor() {
    effect(() => {
      this.billingService.loadInvoices({
        search: this.search(),
        status: this.statusFilter()
      });
    });
  }

  onSearch(e: any) {
    this.search.set(e.target.value);
  }

  filterStatus(e: any) {
    this.statusFilter.set(e.target.value);
  }

  deleteInvoice(id: string) {
    this.billingService.deleteInvoice(id);
  }

  previewInvoice(inv: Invoice) {
    this.openPreview(inv);
  }

  openPreview(inv: Invoice) {
    this.selectedInvoice.set(inv);
  }

  closePreview() {
    this.selectedInvoice.set(null);
  }

  // PDF download
  downloadPDF(inv: Invoice | null) {
    if (!inv) return;
    try {
      // Use A4 in mm for consistent layout
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;

      const currentUser = this.authService.getCurrentUser();
      const toName = (currentUser as any)?.orgname || inv.clientName || (currentUser as any)?.fullname || '-';
      const toAddress = inv.clinicAddress || (currentUser as any)?.address || '';
      const fromName = 'Arana Tech Solutions';
      const fromAddress = 'F#413 Srivari Forest Breeze\nSubramanyapura Road, Bengaluru, Karnataka 560061';

      const issued = new Date(inv.issuedDate).toLocaleDateString();

      // Header (From) — render only if provided
      if (fromName || fromAddress) {
        doc.setFontSize(16);
        if (fromName) doc.text(fromName, 14, 20);
        doc.setFontSize(10);
        if (fromAddress) {
          const fromAddrLines = doc.splitTextToSize(fromAddress, 80);
          // position lines a bit lower depending on whether name printed
          const addrStartY = fromName ? 26 : 22;
          doc.text(fromAddrLines, 14, addrStartY);
        }
      }

      // Invoice box (right)
      doc.setDrawColor(200);
      doc.setFillColor(245, 245, 245);
      const boxX = pageWidth - 90;
      doc.rect(boxX, 12, 76, 28, 'F');
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(`Invoice`, boxX + 6, 20);
      doc.setFontSize(10);
      doc.text(`No: ${inv.invoiceNumber}`, boxX + 6, 26);
      doc.text(`Date: ${issued}`, boxX + 6, 32);

      // From / To
      // Invoice To block (right, under invoice box)
      doc.setFontSize(10);
      doc.text('Invoice To:', boxX, 46);
      doc.setFontSize(9);
      const toLines = doc.splitTextToSize(toName + (toAddress ? '\n' + toAddress : ''), 76);
      doc.text(toLines, boxX, 52);

      // Table header
      const tableTop = 72;
      doc.setFontSize(10);
      doc.setDrawColor(200);
      doc.line(14, tableTop - 4, pageWidth - 14, tableTop - 4);
      doc.text('Description', 14, tableTop);
      doc.text('Billing Cycle', 110, tableTop);
      const qtyX = 155;
      const unitX = 172;
      const amountX = pageWidth - 20;
      doc.text('Qty', qtyX, tableTop);
      doc.text('Unit Price', unitX, tableTop, { align: 'right' });
      doc.text('Amount', amountX, tableTop, { align: 'right' });
      doc.line(14, tableTop + 2, pageWidth - 14, tableTop + 2);

      // Single item row
      const rowY = tableTop + 10;
      const desc = inv.service || 'Subscription';
      const cycle = inv.billingCycle || 'Monthly';
      const cycleDays = this.daysForCycle(cycle);
      const qty = 1;
      const unit = inv.total || 0;
      const amount = unit * qty;

      doc.setFontSize(9);
      doc.text(desc, 14, rowY);
      doc.text(`${cycle} (${cycleDays} days)`, 110, rowY);
      doc.text(String(qty), qtyX, rowY);
      doc.text(`${unit.toFixed(2)}`, unitX, rowY, { align: 'right' });
      doc.text(`${amount.toFixed(2)}`, amountX, rowY, { align: 'right' });

      // Totals
      const gstPercent = inv.gstPercent != null ? inv.gstPercent : 18;
      const subtotal = amount;
      const gstAmount = +(subtotal * (gstPercent / 100));
      const totalDue = +(subtotal + gstAmount);

      const totalsStart = rowY + 16;
      doc.line(110, totalsStart - 6, pageWidth - 14, totalsStart - 6);
      doc.setFontSize(9);
      doc.text(`Subtotal:`, 150, totalsStart);
      doc.text(subtotal.toFixed(2), 188, totalsStart, { align: 'right' });

      doc.text(`GST (${gstPercent}%):`, 150, totalsStart + 7);
      doc.text(gstAmount.toFixed(2), 188, totalsStart + 7, { align: 'right' });

      doc.setFontSize(11);
      doc.text(`Total:`, 150, totalsStart + 16);
      doc.text(totalDue.toFixed(2), 188, totalsStart + 16, { align: 'right' });

      if (inv.balance && Math.abs(inv.balance) > 0) {
        doc.setFontSize(9);
        doc.text(`Balance:`, 150, totalsStart + 26);
        doc.text((inv.balance).toFixed(2), 188, totalsStart + 26, { align: 'right' });
      }

      // Footer notes
      doc.setFontSize(9);
      doc.text('Thank you for your business.', 14, 270);
      doc.text('Terms: Payment due within 15 days. GST included where applicable.', 14, 276);

      doc.save(`Invoice-${inv.invoiceNumber}.pdf`);

    } catch (error) {
      console.error('PDF ERROR:', error);
      alert('PDF Generation Failed! Check console.');
    }
  }

  // Map billing cycle strings to days for display
  daysForCycle(cycle?: string | null): number {
    const v = (cycle || 'monthly').toString().toLowerCase();
    if (v.includes('month')) return 30;
    if (v.includes('quarter')) return 90;
    if (v.includes('half')) return 180;
    if (v.includes('year')) return 365;
    return 30;
  }
}
