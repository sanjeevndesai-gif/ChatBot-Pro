import { Injectable, signal } from '@angular/core';
import { Invoice } from '../models/invoice.model';
import { BillingService } from '../../../services/billing.service';
import { AuthService } from '../../../services/auth.service';

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

  constructor(private billing: BillingService, private auth: AuthService) {}

  loadInvoices(query: InvoiceQuery = {}) {

    this.loading.set(true);

    // TODO: Replace this with actual backend:
    // return this.http.get<Invoice[]>(`/api/invoices`, { params })
    //                .subscribe(res => { ... });

    // Load from backend
    try {
      const user = this.auth.getCurrentUser();
      const mongoId = (user as any)?.mongoId || (user as any)?.userId;
      if (!mongoId) {
        this.invoices.set([]);
        this.loading.set(false);
        return;
      }

        this.billing.getBillingHistory(mongoId).subscribe({
        next: (list: any[]) => {
          // map server objects into Invoice models
          const mapped: Invoice[] = (list || []).map((s: any, idx: number) => ({
            id: s._id || String(idx+1),
            invoiceNumber: s.invoiceNumber || s.invoiceNumber || String(idx+1),
            status: s.status || 'Paid',
            clientName: s.clientName || s.clientName || '',
            service: s.service || s.service || '',
            total: s.total || 0,
            issuedDate: s.issuedDate ? new Date(s.issuedDate) : new Date(),
            balance: s.balance || 0
          }));

          // apply client-side filtering
          let result = mapped;
          if (query.search) {
            result = result.filter(inv =>
              (inv.invoiceNumber+'').includes(query.search!) ||
              inv.clientName.toLowerCase().includes(query.search!.toLowerCase())
            );
          }
          if (query.status) result = result.filter(inv => inv.status === query.status);

          this.invoices.set(result);
          this.loading.set(false);
        },
        error: () => { this.invoices.set([]); this.loading.set(false); }
      });
    } catch (e) {
      this.invoices.set([]);
      this.loading.set(false);
    }
  }

  deleteInvoice(id: string) {
    const updated = this.invoices().filter(inv => inv.id !== id);
    this.invoices.set(updated);
    // TODO: Also delete on backend
  }
}
