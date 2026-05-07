import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-current-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './current-plan.html',
  styleUrls: ['./current-plan.scss']
})
export class CurrentPlan {

  constructor(private modalService: NgbModal) {}

  plan = signal({
    name: 'Basic',
    price: 0,
    currency: '$',
    activeUntil: new Date('2021-12-09')
  });

  daysUsed = signal(12);
  daysTotal = signal(30);

  get progressPercent() {
    return (this.daysUsed() / this.daysTotal()) * 100;
  }

  /** 🔹 OPEN PRICING (WIDE) */
  openPricingModal(content: any) {
    this.modalService.open(content, {
      centered: true,
      backdrop: 'static',
      windowClass: 'pricing-modal'
    });
  }

  /** 🔹 OPEN SUCCESS / CANCEL (SMALL) */
  openSmallModal(content: any) {
    this.modalService.open(content, {
      centered: true,
      windowClass: 'small-modal'
    });
  }

  upgradePlan(planName: string, successModal: any) {
    this.plan.set({ ...this.plan(), name: planName });
    this.modalService.dismissAll();
    this.openSmallModal(successModal);
  }

  confirmCancel(successModal: any) {
    this.modalService.dismissAll();
    this.openSmallModal(successModal);
  }

  closeAll() {
    this.modalService.dismissAll();
  }
}
