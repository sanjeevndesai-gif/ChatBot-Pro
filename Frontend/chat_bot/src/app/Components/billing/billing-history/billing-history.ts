import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingTableService } from './billing-table';
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

  invoices = this.billingService.invoices;
  loading = this.billingService.loading;

  search = signal('');
  statusFilter = signal('');

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
    alert(`Preview: Invoice #${inv.invoiceNumber}`);
  }

  // PDF download
  downloadPDF(inv: Invoice) {
    try {
      const doc = new jsPDF();

      const issued = new Date(inv.issuedDate).toDateString();

      doc.setFontSize(18);
      doc.text(`Invoice #${inv.invoiceNumber}`, 10, 20);

      doc.setFontSize(12);
      doc.text(`Client: ${inv.clientName}`, 10, 40);
      doc.text(`Service: ${inv.service}`, 10, 50);
      doc.text(`Total: $${inv.total}`, 10, 60);
      doc.text(`Issued Date: ${issued}`, 10, 70);
      doc.text(`Balance: $${inv.balance}`, 10, 80);

      doc.save(`Invoice-${inv.invoiceNumber}.pdf`);

    } catch (error) {
      console.error('PDF ERROR:', error);
      alert('PDF Generation Failed! Check console.');
    }
  }
}
