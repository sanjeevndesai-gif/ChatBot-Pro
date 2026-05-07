import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { downloadProfileQr } from '../../utils/qr-utils';
import { AuthService } from '../../services/auth.service';

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

  constructor(public authService: AuthService) {}

  // ✅ IMPORTANT: Replace this with your real profileUrl logic
  // Example:
  // profileUrl = `https://yourdomain.com/profile/${userId}`;
  profileUrl: string = 'https://example.com/profile/1234';

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

  // ✅ WORKS FROM ANY PAGE
  async downloadQr() {
    try {
      await downloadProfileQr(this.profileUrl, 220, 'profile-qr.png');
    } catch (error) {
      console.error('QR download error:', error);
      alert('Unable to download QR. Please try again.');
    }
  }

  logout() {
    this.authService.logout();
  }

}
