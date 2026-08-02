import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'request-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  template: `
    <div class="modal-header">
      <h4 class="modal-title">Request More Info</h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="active.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p>Send a request for more information to <strong>{{ clinic?.name || clinic?.clinicName }}</strong> owner.</p>
      <div class="form-group">
        <label>Message</label>
        <textarea class="form-control" [(ngModel)]="message" rows="4" placeholder="Please provide the clinic registration document"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="active.dismiss()">Cancel</button>
      <button class="btn btn-primary" [disabled]="!message" (click)="confirm()">Send</button>
    </div>
  `
})
export class RequestInfoModal {
  @Input() clinic: any;
  message = '';

  constructor(public active: NgbActiveModal) { }

  confirm() {
    this.active.close({ action: 'request_info', payload: { action: 'request_info', message: this.message } });
  }
}
