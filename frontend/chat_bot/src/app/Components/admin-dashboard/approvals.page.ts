import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { AdminService } from '../../services/admin.service';
import { ApproveModal } from './modals/approve-modal';
import { RejectModal } from './modals/reject-modal';
import { RequestInfoModal } from './modals/request-info-modal';
import { AssignReviewerModal } from './modals/assign-reviewer-modal';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'admin-approvals-page',
  standalone: true,
  imports: [CommonModule, NgbModalModule],
  templateUrl: './approvals.html',
  styleUrls: ['./approvals.scss']
})
export class ApprovalsPage implements OnInit {

  approvals: any[] = [];
  loading = false;

  constructor(private admin: AdminService, private modal: NgbModal, private toast: ToastService) { }

  ngOnInit(): void {
    console.debug('[ApprovalsPage] ngOnInit');
    this.loadApprovals();
  }

  loadApprovals(): void {
    console.debug('[ApprovalsPage] loadApprovals called');
    this.loading = true;
    this.admin.getApprovals(0, 50).subscribe({
      next: (res: any) => {
        this.approvals = res?.content ?? res ?? [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  openApprove(clinic: any) {
    const ref = this.modal.open(ApproveModal, { centered: true });
    (ref.componentInstance as any).clinic = clinic;
    ref.result.then((result) => {
      if (result?.action === 'approve') {
        this.performAction(clinic, result.payload);
      }
    }).catch(() => {});
  }

  openReject(clinic: any) {
    const ref = this.modal.open(RejectModal, { centered: true });
    (ref.componentInstance as any).clinic = clinic;
    ref.result.then((result) => {
      if (result?.action === 'reject') {
        this.performAction(clinic, result.payload);
      }
    }).catch(() => {});
  }

  openRequestInfo(clinic: any) {
    const ref = this.modal.open(RequestInfoModal, { centered: true });
    (ref.componentInstance as any).clinic = clinic;
    ref.result.then((result) => {
      if (result?.action === 'request_info') {
        this.performAction(clinic, result.payload);
      }
    }).catch(() => {});
  }

  openAssignReviewer(clinic: any) {
    const ref = this.modal.open(AssignReviewerModal, { centered: true });
    (ref.componentInstance as any).clinic = clinic;
    ref.result.then((result) => {
      if (result?.action === 'assign') {
        this.performAction(clinic, result.payload);
      }
    }).catch(() => {});
  }

  performAction(clinic: any, payload: any) {
    this.admin.performAction(clinic.id || clinic._id || clinic.clinicId, payload.action, payload).subscribe({
      next: () => {
        this.toast.success('Action completed');
        this.loadApprovals();
      },
      error: (err: any) => {
        this.toast.error(err?.message || 'Action failed');
      }
    });
  }

}
