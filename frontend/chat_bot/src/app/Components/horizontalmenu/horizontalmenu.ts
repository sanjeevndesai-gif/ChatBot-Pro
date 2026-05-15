import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { QrService } from '../../services/qr.service';

interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-horizontalmenu',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgbDropdownModule
  ],
  templateUrl: './horizontalmenu.html',
  styleUrls: ['./horizontalmenu.scss']
})
export class Horizontalmenu {

  mobileMenuOpen: boolean = false;
  openMobileSubmenus: Set<string> = new Set();

  constructor(public authService: AuthService, private qrService: QrService) {}


  // Helper to get userId for QR
  get userId(): string | null {
    return this.authService.getCurrentUser()?.userId ?? null;
  }

  get profilePhoto(): string {
    const user = this.authService.getCurrentUser();
    const mongoId = (user as any)?.mongoId;
    if (mongoId) {
      const saved = localStorage.getItem('profile_photo_' + mongoId);
      if (saved) return saved;
    }
    return 'https://i.pravatar.cc/150';
  }

  menu: MenuItem[] = [
    // { title: 'Dashboards', icon: 'bi-house-door', route: '/appointments' },
    { title: 'Appointments', icon: 'bi-calendar2-week', route: '/book-appointment' },
    { title: 'Scheduler', icon: 'bi-calendar', route: '/scheduler' },
    { title: 'Reports', icon: 'bi-file-earmark-bar-graph', route: '/schedulereport' },
    { title: 'Help', icon: 'bi-info-circle', route: '/help' },
    { title: 'Settings', icon: 'bi-gear', route: '/settings' },
    { title: 'Plan & Billing', icon: 'bi-credit-card', route: '/plan-billing' }
  ];

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleMobileSubmenu(path: string) {
    if (this.openMobileSubmenus.has(path)) {
      this.openMobileSubmenus.delete(path);
    } else {
      this.openMobileSubmenus.add(path);
    }
  }

  isMobileSubmenuOpen(path: string) {
    return this.openMobileSubmenus.has(path);
  }

  // Download backend-generated QR (same as profile page)
  downloadQr() {
    const userId = this.userId;
    if (!userId) {
      alert('User not found. Please login again.');
      return;
    }
    this.qrService.generateQr(userId, 'doctor').subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'profile-qr.png';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('QR download error:', err);
        alert('Unable to download QR. Please try again.');
      }
    });
  }

  logout() {
    this.authService.logout();
  }

}
