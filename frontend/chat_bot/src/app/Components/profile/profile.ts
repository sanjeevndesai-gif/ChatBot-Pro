import {
  Component,
  AfterViewInit,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import QRCode from 'qrcode';
import { QrService } from '../../services/qr.service';
import { AuthService } from '../../services/auth.service';
import { downloadQrFromCanvas } from '../../utils/qr-utils';
import { environment } from '../../../environments/environment';
import { NgbModal, NgbModalModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { AddUser } from '../add-user/add-user';
import { ViewUsers } from '../view-users/view-users';
import { BillingService } from '../../services/billing.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbToastModule, NgbModalModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit, AfterViewInit {


  user: any;
  qrLoading = false;
  qrError = '';
  qrImgUrl: string | null = null;
  showToast = false;
  toastMessage = '';
  planName = 'Basic';
  planDoctorLimit = 1;   // loaded from backend, -1 = unlimited
  doctorCount = 0;

  get isBasicPlanDoctorLimitReached(): boolean {
    return this.planDoctorLimit !== -1 && this.doctorCount >= this.planDoctorLimit;
  }

  constructor(
    private authService: AuthService,
    private modalService: NgbModal,
    private router: Router,
    private billingService: BillingService,
    private userService: UserService,
    private qrService: QrService
  ) { }

  // ngOnInit() {
  //   this.user = this.authService.getCurrentUser();

  //   if (!this.user) {
  //     this.authService.logout();
  //   }
  // }

  ngOnInit() {
    this.user = this.authService.getCurrentUser();

    if (!this.user) {
      this.authService.logout();
      return;
    }

    // Load billing plan
    const mongoId = (this.user as any)?.mongoId;
    if (mongoId) {
      this.billingService.getBilling(mongoId).subscribe({
        next: (info) => {
          this.planName = info.planName;
          this.planDoctorLimit = info.maxDoctors;
        }
      });
    }

    // Count existing doctors — use by-admin endpoint so we only count users created by this admin
    this.userService.getUsersByAdmin(0, 1000, '').subscribe({
      next: (res: any) => {
        const all: any[] = res?.content ?? [];
        const mongoId = (this.user as any)?.mongoId;
        const currentId = mongoId || (this.user as any)?.userId || (this.user as any)?.id || (this.user as any)?._id || null;
        this.doctorCount = all
          .map((u: any) => ({ usersId: u.id || u._id, ...u.payload }))
          .filter((u: any) => (u.role ?? '').toLowerCase() === 'doctor' && (u.usersId !== currentId)).length;
      },
      error: () => {
        // if by-admin lookup fails, fallback to safe default (don't block Add User)
        this.doctorCount = 0;
      }
    });
  }

  get profilePhoto(): string {
    // Prefer photo stored in the user document (saved after profile update)
    const userPhoto = (this.user as any)?.profilePhoto || (this.user as any)?.photo || null;
    if (userPhoto) return userPhoto;

    // Backwards compatibility: fall back to legacy localStorage key
    const mongoId = (this.user as any)?.mongoId;
    if (mongoId) {
      const saved = localStorage.getItem('profile_photo_' + mongoId);
      if (saved) return saved;
    }

    return 'https://i.pravatar.cc/150';
  }


  ngAfterViewInit(): void {
    this.fetchAndRenderQr();
  }

  fetchAndRenderQr(): void {
    if (!this.user?.userId) return;
    this.qrLoading = true;
    this.qrError = '';
    this.qrImgUrl = null;
    this.qrService.generateQr(this.user.userId, 'doctor').subscribe({
      next: (blob: Blob) => {
        console.log('QR blob received', blob);
        const url = URL.createObjectURL(blob);
        this.qrImgUrl = url;
        this.qrLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch QR code', err);
        this.qrError = 'Failed to fetch QR code.';
        this.qrLoading = false;
      }
    });
  }

  get profileUrl(): string {
    return `https://myapp.com/profile/${this.user?.userId}`;
  }

  // generateQR(): void {
  //   if (!this.qrCanvas?.nativeElement || !this.profileUrl) return;
  //   QRCode.toCanvas(
  //     this.qrCanvas.nativeElement,
  //     this.profileUrl,
  //     { width: 150, margin: 2 },
  //     (error) => {
  //       if (error) console.error(error);
  //     }
  //   );
  // }

  downloadQR(): void {
    if (!this.qrImgUrl) return;
    const a = document.createElement('a');
    a.href = this.qrImgUrl;
    a.download = `profile-${this.user.userId}-qr.png`;
    a.click();
  }

  openAddUser() {
    if (this.isBasicPlanDoctorLimitReached) {
      this.toastMessage = `Your ${this.planName} plan allows only ${this.planDoctorLimit} doctor(s). Upgrade your plan to add more.`;
      this.showToast = true;
      return;
    }

    const modalRef = this.modalService.open(AddUser, {
      size: 'lg',
      centered: true
    });

    modalRef.result.then((result) => {
      if (result?.success) {
        this.toastMessage = result.message;
        this.showToast = true;
        this.doctorCount++; // optimistic update

        setTimeout(() => {
          this.router.navigate(['/app/view-users']);
        }, 1000);
      }
    });
  }



  // openViewUsers() {
  //   this.modalService.open(ViewUsers, {
  //     size: 'xl',
  //     centered: true
  //   });
  // }

  openViewUsers() {
    this.router.navigate(['/app/view-users']);
  }

}
