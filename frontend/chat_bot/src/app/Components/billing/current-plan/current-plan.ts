import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BillingService, BillingInfo } from '../../../services/billing.service';
import { AuthService } from '../../../services/auth.service';
import { BillingTableService } from '../billing-history/billing-table';

interface Plan {
  name: string;
  price: number;
  currency: string;
  activeUntil: Date;
}

@Component({
  selector: 'app-current-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './current-plan.html',
  styleUrls: ['./current-plan.scss']
})
export class CurrentPlan implements OnInit {

  plan = signal<Plan>({
    name: 'Basic',
    price: 0,
    currency: '$',
    activeUntil: new Date()
  });

  daysUsed = signal(0);
  daysTotal = signal(30);
  isDeactivated = signal(false);
  nearExpiry = signal(false);
  loading = signal(true);
  backendDaysRemaining = signal<number | null>(null);
  backendProgressPercent = signal<number | null>(null);
  plans = signal<any[]>([]);
  loadingPlans = signal(false);
  // payment modal state
  selectedPlanForPayment: any = null;
  selectedCycleForPayment: string | null = null;

  private mongoId: string | null = null;

  constructor(
    private modalService: NgbModal,
    private billingService: BillingService,
    private authService: AuthService,
    private billingTable: BillingTableService
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.mongoId = (user as any)?.mongoId ?? null;

    if (this.mongoId) {
      this.billingService.getBilling(this.mongoId).subscribe({
        next: (info: BillingInfo) => this.applyBillingInfo(info),
        error: () => this.loading.set(false)
      });
    } else {
      this.loading.set(false);
    }
  }

  private applyBillingInfo(info: BillingInfo) {
    this.plan.set({
      name: info.planName,
      price: info.planPrice,
      currency: info.currency,
      activeUntil: new Date(info.activeUntil)
    });
    this.daysUsed.set(info.daysUsed);
    this.daysTotal.set(info.daysTotal);
    this.isDeactivated.set(info.status === 'deactivated');
    this.nearExpiry.set(info.nearExpiry);
    this.backendDaysRemaining.set(info.daysRemaining ?? null);
    this.backendProgressPercent.set(info.progressPercent ?? null);
    this.loading.set(false);

    // If 100% usage reached, ensure account is deactivated in DB
    if (info.daysUsed >= info.daysTotal && info.status !== 'deactivated' && this.mongoId) {
      this.billingService.deactivateUser(this.mongoId).subscribe();
      this.isDeactivated.set(true);
    }
  }

  get progressPercent() {
    const backend = this.backendProgressPercent();
    if (backend != null) return Math.min(Math.max(backend, 0), 100);
    const pct = (this.daysUsed() / this.daysTotal()) * 100;
    return Math.min(pct, 100);
  }

  get daysRemaining() {
    const backend = this.backendDaysRemaining();
    if (backend != null) return Math.max(backend, 0);
    return Math.max(this.daysTotal() - this.daysUsed(), 0);
  }

  openPricingModal(content: any) {
    if (this.isDeactivated()) return;
    // fetch plans from backend before opening
    this.loadingPlans.set(true);
    this.billingService.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans || []);
        this.loadingPlans.set(false);
        this.modalService.open(content, {
          centered: true,
          backdrop: 'static',
          windowClass: 'pricing-modal'
        });
      },
      error: () => {
        // fallback: open modal with static content
        this.loadingPlans.set(false);
        this.modalService.open(content, {
          centered: true,
          backdrop: 'static',
          windowClass: 'pricing-modal'
        });
      }
    });
  }

  openQRCodeModal(plan: any, cycle: string, qrModal: any) {
    if (this.isDeactivated()) return;
    this.selectedPlanForPayment = plan;
    this.selectedCycleForPayment = cycle;
    this.modalService.open(qrModal, { centered: true, backdrop: 'static', windowClass: 'qr-modal' });
  }

  confirmPayment(successModal: any) {
    if (!this.mongoId || !this.selectedPlanForPayment || !this.selectedCycleForPayment) return;

    // resolve price from plan pricing array
    let price: number | undefined = undefined;
    try {
      const pricing = this.selectedPlanForPayment.pricing || [];
      for (const p of pricing) {
        if (p.billingCycle === this.selectedCycleForPayment) { price = p.price; break; }
      }
    } catch (e) {}

    // 1) upgrade plan
    this.billingService.upgradePlanByCode(this.mongoId, this.selectedPlanForPayment.planCode || this.selectedPlanForPayment.planCode?.toString(), this.selectedCycleForPayment, price).subscribe({
      next: () => {
      console.log('confirmPayment: selectedCycleForPayment=', this.selectedCycleForPayment);
        // 2) record billing history entry (demo fields)
        const invoiceNumber = Math.floor(Date.now() / 1000);
        const currentUser = this.authService.getCurrentUser();
        const clientName = (currentUser as any)?.orgname || (currentUser as any)?.fullname || this.selectedPlanForPayment.name || this.plan().name;
        const cycleDays = this.cycleToDays(this.selectedCycleForPayment || 'Monthly');
        const hist = {
          invoiceNumber: invoiceNumber,
          status: 'Paid',
          clientName: clientName,
          service: this.selectedPlanForPayment.name || this.plan().name,
          billingCycle: this.selectedCycleForPayment || 'Monthly',
          daysTotal: cycleDays,
          gstPercent: 18,
          clinicAddress: (currentUser as any)?.address || '',
          total: price || this.getMonthlyPrice(this.selectedPlanForPayment),
          issuedDate: new Date().toISOString(),
          balance: 0
        };
        this.billingService.recordBillingHistory(this.mongoId!, hist).subscribe({
          next: () => {
            // update UI immediately using selected cycle days
            try {
              console.log('apply UI days:', this.cycleToDays(this.selectedCycleForPayment));
              this.daysTotal.set(this.cycleToDays(this.selectedCycleForPayment));
              this.daysUsed.set(0);
              this.isDeactivated.set(false);
              this.backendDaysRemaining.set(this.cycleToDays(this.selectedCycleForPayment));
              this.backendProgressPercent.set(0);
              const active = new Date();
              active.setDate(active.getDate() + this.cycleToDays(this.selectedCycleForPayment));
              this.plan.set({
                name: this.selectedPlanForPayment.name || this.plan().name,
                price: price || this.getMonthlyPrice(this.selectedPlanForPayment),
                currency: this.plan().currency,
                activeUntil: active
              });
            } catch (e) { /* ignore UI update errors */ }
            // refresh billing info from backend and show success
            this.billingService.getBilling(this.mongoId!).subscribe({ next: (info) => { this.applyBillingInfo(info); this.overrideSelectedCycleDays(); } });
            // reload billing history table
            try { this.billingTable.loadInvoices(); } catch (e) { /* ignore */ }
            this.modalService.dismissAll();
            this.openSmallModal(successModal);
          },
          error: () => {
            // update UI immediately even if recording failed, then refresh
            try {
              this.daysTotal.set(this.cycleToDays(this.selectedCycleForPayment));
              this.daysUsed.set(0);
              this.isDeactivated.set(false);
              this.backendDaysRemaining.set(this.cycleToDays(this.selectedCycleForPayment));
              this.backendProgressPercent.set(0);
              const active = new Date();
              active.setDate(active.getDate() + this.cycleToDays(this.selectedCycleForPayment));
              this.plan.set({
                name: this.selectedPlanForPayment.name || this.plan().name,
                price: price || this.getMonthlyPrice(this.selectedPlanForPayment),
                currency: this.plan().currency,
                activeUntil: active
              });
            } catch (e) { /* ignore */ }
            this.billingService.getBilling(this.mongoId!).subscribe({ next: (info) => { this.applyBillingInfo(info); this.overrideSelectedCycleDays(); } });
            // reload billing history table even on error
            try { this.billingTable.loadInvoices(); } catch (e) { /* ignore */ }
            this.modalService.dismissAll();
            this.openSmallModal(successModal);
          }
        });
      },
      error: () => {
        // handle upgrade error (dismiss QR modal)
        this.modalService.dismissAll();
      }
    });
  }

  openSmallModal(content: any) {
    this.modalService.open(content, { centered: true, windowClass: 'small-modal' });
  }

  upgradePlan(planName: string, planPrice: number, successModal: any) {
    if (!this.mongoId) return;
    this.billingService.upgradePlan(this.mongoId, planName, planPrice).subscribe({
      next: () => {
        // Refresh billing info after upgrade
        this.billingService.getBilling(this.mongoId!).subscribe({
          next: (info) => this.applyBillingInfo(info)
        });
        try { this.billingTable.loadInvoices(); } catch (e) { /* ignore */ }
        this.modalService.dismissAll();
        this.openSmallModal(successModal);
      }
    });
  }

  upgradePlanByCode(plan: any, billingCycle: string, successModal: any) {
    if (!this.mongoId) return;
    // Resolve price for selected billingCycle if available
    let price: number | undefined = undefined;
    try {
      const pricing = plan.pricing || plan.prices || [];
      for (const p of pricing) {
        if (p.billingCycle === billingCycle) { price = p.price; break; }
      }
    } catch (e) { /* ignore */ }

    this.billingService.upgradePlanByCode(this.mongoId, plan.planCode || plan.planCode?.toString(), billingCycle, price).subscribe({
      next: () => {
        this.billingService.getBilling(this.mongoId!).subscribe({ next: (info) => this.applyBillingInfo(info) });
        try { this.billingTable.loadInvoices(); } catch (e) { /* ignore */ }
        this.modalService.dismissAll();
        this.openSmallModal(successModal);
      }
    });
  }

  getMonthlyPrice(plan: any): number {
    try {
      return plan.pricing && plan.pricing.length ? plan.pricing[0].price : (plan.planPrice || 0);
    } catch (e) { return plan.planPrice || 0; }
  }

  // Map billing cycle to approximate days
  cycleToDays(billingCycle: string | null | undefined): number {
    const cycle = (billingCycle || 'monthly').toString().toLowerCase();
    if (cycle.includes('month')) return 30;
    if (cycle.includes('quarter') || cycle.includes('quarterly')) return 90;
    if (cycle.includes('half') || cycle.includes('half-year') || cycle.includes('half_year') || cycle.includes('half-yearly')) return 180;
    if (cycle.includes('year')) return 365;
    return 30;
  }

  // After backend billing info is applied, ensure UI reflects the selected cycle days
  overrideSelectedCycleDays() {
    try {
      if (!this.selectedCycleForPayment) return;
      const days = this.cycleToDays(this.selectedCycleForPayment);
      this.daysTotal.set(days);
      this.daysUsed.set(0);
      this.backendDaysRemaining.set(days);
      this.backendProgressPercent.set(0);
      const active = new Date();
      active.setDate(active.getDate() + days);
      this.plan.set({ name: this.selectedPlanForPayment?.name || this.plan().name, price: this.plan().price, currency: this.plan().currency, activeUntil: active });
    } catch (e) { /* ignore */ }
  }

  confirmCancel(cancelledModal: any) {
    if (!this.mongoId) return;
    this.billingService.deactivateUser(this.mongoId).subscribe({
      next: () => {
        this.isDeactivated.set(true);
        this.modalService.dismissAll();
        this.openSmallModal(cancelledModal);
      }
    });
  }

  closeAll() {
    this.modalService.dismissAll();
  }
}
