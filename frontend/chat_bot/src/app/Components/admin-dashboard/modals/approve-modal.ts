import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'approve-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  template: `
    <div class="modal-header">
      <h4 class="modal-title">Approve Clinic</h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="active.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p>Are you sure you want to approve <strong>{{ clinic?.name || clinic?.clinicName }}</strong>?</p>
      <div class="form-group">
        <label>Optional Note</label>
        <textarea class="form-control" [(ngModel)]="note" rows="3"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="active.dismiss()">Cancel</button>
      <button class="btn btn-primary" (click)="confirm()">Approve</button>
    </div>
  `
})
export class ApproveModal {
  @Input() clinic: any;
  note = '';

  constructor(public active: NgbActiveModal) { }

  confirm() {
    this.active.close({ action: 'approve', payload: { action: 'approve', reason: this.note } });
  }
}
