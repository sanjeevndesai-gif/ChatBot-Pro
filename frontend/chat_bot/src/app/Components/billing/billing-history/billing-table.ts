import { Injectable, signal } from '@angular/core';
import { Invoice } from '../models/invoice.model';

export interface InvoiceQuery {
  search?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillingTableService {

  invoices = signal<Invoice[]>([]);
  loading = signal(false);

  constructor() {}

  loadInvoices(query: InvoiceQuery = {}) {

    this.loading.set(true);

    // TODO: Replace this with actual backend:
    // return this.http.get<Invoice[]>(`/api/invoices`, { params })
    //                .subscribe(res => { ... });

    setTimeout(() => {
      const mock: Invoice[] = [
        {
          id: '1',
          invoiceNumber: '5041',
          status: 'Paid',
          clientName: 'Shamus Tuttle',
          service: 'Software Development',
          total: 2230,
          issuedDate: new Date('2020-11-19'),
          balance: 0
        },
        {
          id: '2',
          invoiceNumber: '5027',
          status: 'Paid',
          clientName: 'Devonne Wallbridge',
          service: 'Software Development',
          total: 2787,
          issuedDate: new Date('2020-09-25'),
          balance: 0
        },
        {
          id: '3',
          invoiceNumber: '5024',
          status: 'Partial',
          clientName: 'Ariella Filippyev',
          service: 'Extended License',
          total: 5285,
          issuedDate: new Date('2020-08-02'),
          balance: -202
        }
      ];

      // Filtering logic
      let result = mock;

      if (query.search) {
        result = result.filter(inv =>
          inv.invoiceNumber.includes(query.search!) ||
          inv.clientName.toLowerCase().includes(query.search!.toLowerCase())
        );
      }

      if (query.status) {
        result = result.filter(inv => inv.status === query.status);
      }

      this.invoices.set(result);
      this.loading.set(false);

    }, 600);
  }

  deleteInvoice(id: string) {
    const updated = this.invoices().filter(inv => inv.id !== id);
    this.invoices.set(updated);
    // TODO: Also delete on backend
  }
}
