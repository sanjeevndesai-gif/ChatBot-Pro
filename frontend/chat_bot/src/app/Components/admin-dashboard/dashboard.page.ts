import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';

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
    todaysLogins: 0
  };

  loading = false;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.fetchOverview();
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
          todaysLogins: res.todaysLogins ?? 0
        };
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

}
