import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'assign-reviewer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  template: `
    <div class="modal-header">
      <h4 class="modal-title">Assign Reviewer</h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="active.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p>Assign a reviewer to <strong>{{ clinic?.name || clinic?.clinicName }}</strong>.</p>
      <div class="form-group">
        <label>Reviewer ID</label>
        <input class="form-control" [(ngModel)]="reviewerId" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="active.dismiss()">Cancel</button>
      <button class="btn btn-primary" [disabled]="!reviewerId" (click)="confirm()">Assign</button>
    </div>
  `
})
export class AssignReviewerModal {
  @Input() clinic: any;
  reviewerId = '';

  constructor(public active: NgbActiveModal) { }

  confirm() {
    this.active.close({ action: 'assign', payload: { action: 'assign', reviewerId: this.reviewerId } });
  }
}
