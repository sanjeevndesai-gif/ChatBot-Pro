import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';

import { UserService } from '../../services/user.service';
import { AddUser } from '../add-user/add-user';
import { LoggerService } from '../../services/logger.service';
import { BillingService } from '../../services/billing.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-view-users',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbToastModule],
  templateUrl: './view-users.html',
  styleUrl: './view-users.scss'
})
export class ViewUsers implements OnInit {

  users: any[] = [];
  filteredList: any[] = [];
  pagedList: any[] = [];

  loading = true;
  errorMessage = '';
  planLimitToast = false;
  planLimitMessage = '';
  planLimitInlineMessage = '';

  searchText: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private userService: UserService,
    private modalService: NgbModal,
    private logger: LoggerService,
    private billingService: BillingService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  /* =====================================================
     LOAD USERS FROM BACKEND + CACHE FALLBACK
  ===================================================== */
  // loadUsers() {
  //   this.loading = true;
  //   this.errorMessage = '';

  //   this.userService.getUsers().subscribe({
  //     next: (data) => {
  //       this.users = (data as any[]) ?? [];
  //       this.applyFilter();
  //       this.loading = false;
  //     },
  //     error: (err) => {
  //       // This error only happens when:
  //       // ❌ API fails AND ❌ cache is empty
  //       this.errorMessage = err.message;
  //       this.loading = false;
  //     }
  //   });
  // }

  loadUsers() {

    this.loading = true;
    this.errorMessage = '';

    this.userService.getUsers().subscribe({

      next: (data: any) => {

        const list = data?.content ?? [];

        // flatten payload and filter out admin users
        this.users = list
          .map((u: any) => ({
            usersId: u.id || u._id,
            ...u.payload
          }))
          .filter((user: any) => (user.role ?? '').toLowerCase() !== 'admin');

        this.applyFilter();

        this.loading = false;
      },

      error: (err) => {
        this.errorMessage = err.message;
        this.loading = false;
      }

    });
  }


  /* =====================================================
     FILTER
  ===================================================== */
  // applyFilter(resetPage: boolean = true) {
  //   const text = (this.searchText || '').toLowerCase();

  //   this.filteredList = (this.users || []).filter(u =>
  //     (u?.name || '').toLowerCase().includes(text) ||
  //     (u?.phone || '').toLowerCase().includes(text) ||
  //     (u?.role || '').toLowerCase().includes(text) ||
  //     (u?.specialization || '').toLowerCase().includes(text)
  //   );

  //   this.applySorting();

  //   if (resetPage) this.currentPage = 1;

  //   this.paginate();
  // }
  applyFilter(resetPage: boolean = true) {

    const text = (this.searchText || '').toLowerCase();

    this.filteredList = (this.users || [])
      .filter(u => (u.role ?? '').toLowerCase() !== 'admin') // filter out admin again for safety
      .filter(u =>
        (u?.name || '').toLowerCase().includes(text) ||
        (u?.phone || '').toLowerCase().includes(text) ||
        (u?.role || '').toLowerCase().includes(text) ||
        (u?.specialization || '').toLowerCase().includes(text)
      );

    this.applySorting();

    if (resetPage) this.currentPage = 1;

    this.paginate();
  }

  /* =====================================================
     SORT
  ===================================================== */
  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applySorting();
    this.paginate();
  }

  applySorting() {

    if (!this.sortColumn) return;

    this.filteredList.sort((a, b) => {

      const valA = (a[this.sortColumn] || '').toString().toLowerCase();
      const valB = (b[this.sortColumn] || '').toString().toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;

    });

  }

  /* =====================================================
     PAGINATION
  ===================================================== */
  paginate() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));

    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.pagedList = this.filteredList.slice(start, end);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.paginate(); } }
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.paginate(); } }
  goToPage(page: number) { this.currentPage = page; this.paginate(); }
  pageSizeChanged() { this.applyFilter(true); }

  /* =====================================================
     MODAL
  ===================================================== */
  openAddUser() {
    const user = this.authService.getCurrentUser();
    const mongoId = (user as any)?.mongoId;

    if (!mongoId) {
      this.planLimitInlineMessage = 'Unable to verify your plan. Please login again.';
      this.planLimitMessage = this.planLimitInlineMessage;
      this.planLimitToast = true;
      setTimeout(() => this.planLimitToast = false, 5000);
      return;
    }

    this.billingService.getBilling(mongoId).subscribe({
      next: (billing) => {
        const doctorCount = this.users.filter(
          (u: any) => (u.role ?? '').toLowerCase() === 'doctor'
        ).length;

        // Prefer backend maxDoctors; fallback keeps Basic protected if older API response is missing this field.
        const hasMaxDoctors = typeof (billing as any)?.maxDoctors === 'number';
        const maxDoctors = hasMaxDoctors
          ? (billing as any).maxDoctors
          : ((billing?.planName ?? '').toLowerCase() === 'basic' ? 1 : -1);

        if (maxDoctors !== -1 && doctorCount >= maxDoctors) {
          this.planLimitInlineMessage = 'Limit reached: your current plan allows to add  only limited users. Please upgrade to add more';
          this.planLimitMessage = this.planLimitInlineMessage;
          this.planLimitToast = true;
          setTimeout(() => this.planLimitToast = false, 5000);
          return;
        }

        this.planLimitInlineMessage = '';
        const modalRef = this.modalService.open(AddUser, { size: 'lg', centered: true });
        modalRef.result.then((result) => {
          if (result?.success) {
            this.logger.info(result.message);
            this.loadUsers();
          }
        }).catch(() => {});
      },
      error: () => {
        this.planLimitInlineMessage = 'Unable to verify plan limits right now. Please try again in a moment.';
        this.planLimitMessage = this.planLimitInlineMessage;
        this.planLimitToast = true;
        setTimeout(() => this.planLimitToast = false, 5000);
      }
    });
  }

  editUser(user: any) {
    const modalRef = this.modalService.open(AddUser, { size: 'lg', centered: true });
    modalRef.componentInstance.userData = user;

    modalRef.result.then((result) => {
      if (result?.success) {
        this.logger.info(result.message);
        this.loadUsers();
      }
    });
  }

  deleteUser(user: any) {

    const confirmDelete = confirm(`Delete ${user.name}?`);

    if (!confirmDelete) return;

    this.userService.deleteUser(user.usersId).subscribe({
      next: () => {
        this.loadUsers();
        this.logger.info('User deleted', user);
      },
      error: (err) => {
        alert(err.message);
      }
    });
  }


  /* =====================================================
     EXPORT CSV
  ===================================================== */
  // exportCSV() {
  //   if (!this.filteredList.length) {
  //     this.logger.warn('CSV Export Blocked — No Data');
  //     return;
  //   }

  //   const ws = XLSX.utils.json_to_sheet(this.filteredList);
  //   const csv = XLSX.utils.sheet_to_csv(ws);

  //   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  //   const link = document.createElement("a");
  //   link.href = URL.createObjectURL(blob);
  //   link.download = "Users_List.csv";
  //   link.click();

  //   this.logger.info('CSV Export Success', this.filteredList.length);
  // }

  exportCSV() {

    if (!this.filteredList.length) {
      this.logger.warn('CSV Export Blocked — No Data');
      return;
    }

    /* =========================================
       1️⃣ Prepare formatted data
    ========================================= */
    const exportData = this.filteredList.map((user, index) => ({
      "Sl.No": index + 1,
      "User ID": user.usersId ?? '',
      "Name": user.name ?? '',
      "Phone": user.phone ?? '',
      "Specialization": user.specialization ?? '',
      "Role": user.role ?? ''
    }));

    /* =========================================
       2️⃣ Convert to worksheet
    ========================================= */
    const ws = XLSX.utils.json_to_sheet(exportData, {
      skipHeader: false
    });

    /* =========================================
       3️⃣ Convert to CSV
    ========================================= */
    const csv = XLSX.utils.sheet_to_csv(ws);

    /* =========================================
       4️⃣ Download file
    ========================================= */
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "Users_List.csv";
    link.click();

    this.logger.info('CSV Export Success', exportData.length);
  }

}
