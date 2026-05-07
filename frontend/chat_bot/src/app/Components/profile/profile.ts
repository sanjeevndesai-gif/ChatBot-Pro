import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import QRCode from 'qrcode';
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

  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  user: any;
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
    private userService: UserService
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

    // Count existing doctors
    this.userService.getUsers(0, 1000, '').subscribe({
      next: (res: any) => {
        const all: any[] = res?.content ?? [];
        this.doctorCount = all.filter(
          (u: any) => (u.payload?.role ?? '').toLowerCase() === 'doctor'
        ).length;
      }
    });
  }

  get profilePhoto(): string {
    const mongoId = (this.user as any)?.mongoId;
    if (mongoId) {
      const saved = localStorage.getItem('profile_photo_' + mongoId);
      if (saved) return saved;
    }
    return 'https://i.pravatar.cc/150';
  }


  ngAfterViewInit(): void {
    this.generateQR();
  }

  get profileUrl(): string {
    return `https://myapp.com/profile/${this.user?.userId}`;
  }

  generateQR(): void {
    if (!this.qrCanvas?.nativeElement || !this.profileUrl) return;

    QRCode.toCanvas(
      this.qrCanvas.nativeElement,
      this.profileUrl,
      { width: 150, margin: 2 },
      (error) => {
        if (error) console.error(error);
      }
    );
  }

  downloadQR(): void {
    downloadQrFromCanvas(
      this.qrCanvas.nativeElement,
      `profile-${this.user.userId}-qr.png`
    );
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
          this.router.navigate(['/view-users']);
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
    this.router.navigate(['/view-users']);
  }

}
