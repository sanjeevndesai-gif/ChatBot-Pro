export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'Paid' | 'Partial' | 'Sent' | 'Due' | 'Draft';
  clientName: string;
  service: string;
  total: number;
  issuedDate: Date;
  balance: number;
  billingCycle?: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | string;
  gstPercent?: number;
  clinicAddress?: string;
}
