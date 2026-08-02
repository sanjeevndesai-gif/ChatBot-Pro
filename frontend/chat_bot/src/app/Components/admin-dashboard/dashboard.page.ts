import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'admin-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardPage implements OnInit {

  metrics: any = {
    totalClinics: 0,
    pendingApprovals: 0,
    approvedClinics: 0,
    rejectedClinics: 0,
    totalSubscribed: 0,
    todaysSignups: 0,
    totalUsers: 0,
    todaysLogins: 0,
    totalRevenue: 0
  };

  loading = false;
  approvals: any[] = [];

  constructor(private admin: AdminService, private auth: AuthService) {}

  ngOnInit(): void {
    // Only fetch admin data for users with explicit `admin` role.
    const user = this.auth.getCurrentUser();
    // Normalize roles: prefer `roles` array, fall back to legacy `role` string
    let roles: string[] = [];
    if (user) {
      if (Array.isArray((user as any).roles)) roles = (user as any).roles;
      else if ((user as any).role) roles = [(user as any).role];
    }
    const isAdmin = roles.includes('admin');
    if (!isAdmin) {
      console.debug('[DashboardPage] skipping admin calls - current roles:', roles);
      return;
    }

    this.fetchOverview();
    this.fetchApprovals();
  }

  fetchOverview(): void {
    this.loading = true;
    this.admin.getOverview().subscribe({
      next: (res: any) => {
        this.metrics = {
          totalClinics: res.totalClinics ?? 0,
          pendingApprovals: res.pendingApprovals ?? 0,
          approvedClinics: res.approvedClinics ?? 0,
          rejectedClinics: res.rejectedClinics ?? 0,
          totalSubscribed: res.totalSubscribed ?? 0,
          todaysSignups: res.todaysSignups ?? 0,
          totalUsers: res.totalUsers ?? 0,
          todaysLogins: res.todaysLogins ?? 0,
          totalRevenue: res.totalRevenue ?? 0
        };
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  fetchApprovals(): void {
    this.admin.getApprovals(0, 5).subscribe({
      next: (res: any) => {
        this.approvals = res?.content ?? [];
      },
      error: () => { this.approvals = []; }
    });
  }

  approve(item: any): void {
    const id = this.resolveId(item);
    if (!id) {
      console.warn('approve: no id available for item', item);
      return;
    }
    console.debug('[DashboardPage] approving', id);
    this.admin.performAction(id, 'approve', {}).subscribe({
      next: (res: any) => {
        console.debug('[DashboardPage] approve result', res);
        this.fetchApprovals();
        this.fetchOverview();
      },
      error: (err: any) => {
        console.error('approve failed', err);
      }
    });
  }

  reject(item: any): void {
    const id = this.resolveId(item);
    if (!id) {
      console.warn('reject: no id available for item', item);
      return;
    }
    console.debug('[DashboardPage] rejecting', id);
    this.admin.performAction(id, 'reject', { reason: 'Rejected from dashboard' }).subscribe({
      next: (res: any) => {
        console.debug('[DashboardPage] reject result', res);
        this.fetchApprovals();
        this.fetchOverview();
      },
      error: (err: any) => {
        console.error('reject failed', err);
      }
    });
  }

  private resolveId(item: any): string | null {
    if (!item) return null;
    // prefer explicit userId/clinicId
    if (item.userId && typeof item.userId === 'string') return item.userId;
    if (item.clinicId && typeof item.clinicId === 'string') return item.clinicId;
    if (item.id && typeof item.id === 'string') return item.id;

    // handle common MongoDB ObjectId serializations
    const _id = item._id || item.id || null;
    if (!_id) return null;
    if (typeof _id === 'string') return _id;
    // { $oid: '...' }
    if (_id.$oid && typeof _id.$oid === 'string') return _id.$oid;
    if (_id['$oid'] && typeof _id['$oid'] === 'string') return _id['$oid'];
    // some serializers show { oid: '...' }
    if (_id.oid && typeof _id.oid === 'string') return _id.oid;
    // ObjectId with toString/toHexString
    try {
      if (typeof _id.toString === 'function') {
        const s = _id.toString();
        // toString may return '[object Object]' for plain objects, bail out
        if (s && !s.includes('[object')) return s;
      }
      if (typeof _id.toHexString === 'function') {
        return _id.toHexString();
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

}
