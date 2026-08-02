import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'reject-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  template: `
    <div class="modal-header">
      <h4 class="modal-title">Reject Clinic</h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="active.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p>Provide reason for rejecting <strong>{{ clinic?.name || clinic?.clinicName }}</strong>:</p>
      <div class="form-group">
        <label>Reason (required)</label>
        <textarea class="form-control" [(ngModel)]="reason" rows="4"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="active.dismiss()">Cancel</button>
      <button class="btn btn-danger" [disabled]="!reason" (click)="confirm()">Reject</button>
    </div>
  `
})
export class RejectModal {
  @Input() clinic: any;
  reason = '';

  constructor(public active: NgbActiveModal) { }

  confirm() {
    this.active.close({ action: 'reject', payload: { action: 'reject', reason: this.reason } });
  }
}
