import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { QrService } from '../../services/qr.service';
import { ToastService } from '../../services/toast.service';

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
export class Horizontalmenu implements OnInit {

  mobileMenuOpen: boolean = false;
  openMobileSubmenus: Set<string> = new Set();
  // Notification indicators (updated by real-time/periodic checks elsewhere)
  hasNewMessages: boolean = false;
  hasServerAlerts: boolean = false;
  // Admin-specific notification state
  isAdmin: boolean = false;
  hasApprovalRequests: boolean = false;

  constructor(public authService: AuthService, private qrService: QrService, private toast: ToastService, private admin: AdminService, private router: Router) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser() as any;
    const roles: string[] = [];
    if (user) {
      if (Array.isArray(user.roles)) user.roles.forEach((r: any) => { if (r) roles.push(r.toString().toLowerCase()); });
      else if (user.role) roles.push(user.role.toString().toLowerCase());
    }
    this.isAdmin = roles.includes('admin');

    // If admin, check for pending approval requests (small, lightweight check)
    if (this.isAdmin) {
      this.admin.getApprovals(0, 1).subscribe({
        next: (res: any) => {
          const count = (res && res.content && Array.isArray(res.content)) ? res.content.length : 0;
          this.hasApprovalRequests = count > 0;
        },
        error: (err: any) => {
          console.debug('[Horizontalmenu] approval check failed', err);
          this.hasApprovalRequests = false;
        }
      });
    }
  }


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
    { title: 'Appointments', icon: 'bi-calendar2-week', route: '/app/book-appointment' },
    { title: 'Scheduler', icon: 'bi-calendar', route: '/app/scheduler' },
    { title: 'Reports', icon: 'bi-file-earmark-bar-graph', route: '/app/schedulereport' },
    { title: 'Help', icon: 'bi-info-circle', route: '/app/help' },
    { title: 'Settings', icon: 'bi-gear', route: '/app/settings' },
      { title: 'Plan & Billing', icon: 'bi-credit-card', route: '/app/plan-billing' }
  ];

  // Compute visible menu based on user role (admins should not see regular app items)
  get visibleMenu(): MenuItem[] {
    const user = this.authService.getCurrentUser() as any;
    // Normalize roles into an array and require explicit 'admin' membership.
    const roles: string[] = [];
    if (user) {
      if (Array.isArray(user.roles)) {
        user.roles.forEach((r: any) => { if (r) roles.push(r.toString().toLowerCase()); });
      } else if (user.role) {
        roles.push(user.role.toString().toLowerCase());
      }
    }

    // If user is admin, hide user-facing app items that are not relevant to admin
    if (roles.includes('admin')) {
      const excludedRoutes = new Set([
        '/app/book-appointment',
        '/app/scheduler',
        '/app/schedulereport',
        '/app/help',
        '/app/settings',
        '/app/plan-billing'
      ]);

      return this.menu.filter(m => !m.route || !excludedRoutes.has(m.route));
    }

    return this.menu;
  }

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

  // Show friendly message when notification items are clicked but none exist
  showNoMessages() {
    this.toast.info('No messages');
  }

  showNoAlerts() {
    this.toast.info('There are no server alerts');
  }

  goToApprovals() {
    // navigate to admin approvals page
    this.router.navigate(['/admin/approvals']).catch(() => {
      // fallback route used in this app: admin dashboard approvals route
      this.router.navigate(['/admin']).catch(() => {});
    });
  }

}
