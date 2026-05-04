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


  constructor(
    private authService: AuthService,
    private modalService: NgbModal,
    private router: Router,
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
    }
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
    const modalRef = this.modalService.open(AddUser, {
      size: 'lg',
      centered: true
    });

    modalRef.result.then((result) => {
      if (result?.success) {
        this.toastMessage = result.message;
        this.showToast = true;

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
