import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BillingService, BillingInfo } from '../../../services/billing.service';
import { AuthService } from '../../../services/auth.service';

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

  private mongoId: string | null = null;

  constructor(
    private modalService: NgbModal,
    private billingService: BillingService,
    private authService: AuthService
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
    this.loading.set(false);

    // If 100% usage reached, ensure account is deactivated in DB
    if (info.daysUsed >= info.daysTotal && info.status !== 'deactivated' && this.mongoId) {
      this.billingService.deactivateUser(this.mongoId).subscribe();
      this.isDeactivated.set(true);
    }
  }

  get progressPercent() {
    const pct = (this.daysUsed() / this.daysTotal()) * 100;
    return Math.min(pct, 100);
  }

  get daysRemaining() {
    return Math.max(this.daysTotal() - this.daysUsed(), 0);
  }

  openPricingModal(content: any) {
    if (this.isDeactivated()) return;
    this.modalService.open(content, {
      centered: true,
      backdrop: 'static',
      windowClass: 'pricing-modal'
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
        this.modalService.dismissAll();
        this.openSmallModal(successModal);
      }
    });
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
