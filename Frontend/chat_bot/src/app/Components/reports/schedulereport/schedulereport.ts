import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { ScheduleService } from '../../../services/schedule.service';
import { LoggerService } from '../../../services/logger.service';
import { ScheduleItem } from '../../../models/schedule.model';

// export function isValidSchedule(item: any): item is ScheduleItem {
//   return (
//     typeof item?.project === 'string' &&
//     typeof item?.name === 'string' &&
//     typeof item?.date === 'string' &&
//     typeof item?.slot === 'string' &&
//     ['Active', 'Completed', 'Pending', 'Cancelled'].includes(item?.status)
//   );
// }

// interface ScheduleItem {
//   project: string;
//   name: string;
//   date: string; // DD/MM/YYYY
//   slot: string; // HH:MM AM - HH:MM PM
//   status: 'Active' | 'Completed' | 'Pending' | 'Cancelled';
// }

@Component({
  selector: 'app-schedulereport',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedulereport.html',
  styleUrl: './schedulereport.scss'
})
export class Schedulereport {

  // Filters
  searchText: string = '';
  dateRange: string = 'today';
  startDate: string = '';
  endDate: string = '';
  statusFilter: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  pagedList: ScheduleItem[] = [];

  // Prevent unwanted page reset
  resetPageOnFilter: boolean = true;

  schedules: ScheduleItem[] = [];

  filteredList: ScheduleItem[] = [];

  statusConfig: any = {
    'Active': { badge: 'bg-primary', icon: 'bi-check-circle' },
    'Completed': { badge: 'bg-success', icon: 'bi-check2-all' },
    'Pending': { badge: 'bg-warning text-dark', icon: 'bi-hourglass-split' },
    'Cancelled': { badge: 'bg-danger', icon: 'bi-x-circle' }
  };

  // constructor() {
  //   this.applyFilter();
  // }

  constructor(
    private scheduleService: ScheduleService,
    private logger: LoggerService
  ) {
    this.initData();
  }

  initData() {
    const cached = this.scheduleService.loadFromLocal();

    if (cached.length) {
      this.schedules = cached;
      this.logger.info('Loaded data from LocalStorage');
      this.applyFilter();
    } else {
      this.loadFromApi();
    }
  }

  loadFromApi() {
    this.scheduleService.fetchSchedules().subscribe({
      next: (data) => {
        this.schedules = this.scheduleService.processApiData(data);
        this.logger.info('Loaded data from API', this.schedules.length);
        this.applyFilter();
      },
      error: (err) => {
        this.logger.error('API Failed — using cache', err);
        this.schedules = this.scheduleService.loadFromLocal();
        this.applyFilter();
      }
    });
  }



  // Convert DD/MM/YYYY → Date
  toDate(d: string): Date {
    const [day, month, year] = d.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  // Convert HH:MM to minutes
  convertToMinutes(timeRange: string): number {
    const start = timeRange.split(" - ")[0];
    const [hhmm, period] = start.split(" ");
    let [h, m] = hhmm.split(":").map(Number);

    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;

    return h * 60 + m;
  }

  // Sort dates DESC then time ASC
  sortByDateThenSlot(list: ScheduleItem[]) {
    return [...list].sort((a, b) => {
      const dateDiff = this.toDate(b.date).getTime() - this.toDate(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return this.convertToMinutes(a.slot) - this.convertToMinutes(b.slot);
    });
  }

  safe(v: any): string {
    return (v ?? '').toString().toLowerCase();
  }

  applyFilter(resetPage: boolean = true) {
    // const text = this.searchText.toLowerCase();
    const text = this.safe(this.searchText);
    const today = new Date();

    this.filteredList = this.schedules.filter(item => {
      const itemDate = this.toDate(item.date);
      let matchesDate = true;

      // (same date filter logic you already have)
      if (this.dateRange === 'today') {
        matchesDate = itemDate.toDateString() === today.toDateString();
      } else if (this.dateRange === 'yesterday') {
        const y = new Date();
        y.setDate(today.getDate() - 1);
        matchesDate = itemDate.toDateString() === y.toDateString();
      } else if (this.dateRange === 'week') {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        matchesDate = itemDate >= start && itemDate <= end;
      } else if (this.dateRange === 'month') {
        matchesDate =
          itemDate.getMonth() === today.getMonth() &&
          itemDate.getFullYear() === today.getFullYear();
      } else if (this.dateRange === 'year') {
        matchesDate = itemDate.getFullYear() === today.getFullYear();
      } else if (this.dateRange === 'custom') {
        const start = this.startDate ? new Date(this.startDate + "T00:00:00") : null;
        const end = this.endDate ? new Date(this.endDate + "T23:59:59") : null;
        matchesDate =
          (!start || itemDate >= start) &&
          (!end || itemDate <= end);
      }


      const matchesText =
        this.safe(item.id).includes(text) ||
        this.safe(item.name).includes(text) ||
        this.safe(item.status).includes(text) ||
        this.safe(item.date).includes(text) ||
        this.safe(item.slot).includes(text);



      const matchesStatus = this.statusFilter ? item.status === this.statusFilter : true;

      return matchesText && matchesDate && matchesStatus;
    });

    // Sort
    this.filteredList = this.sortByDateThenSlot(this.filteredList);

    // If requested, reset to first page
    if (resetPage) {
      this.currentPage = 1;
    }

    // Recompute pages & slice
    this.paginate();
  }


  resetFilters() {
    this.searchText = '';
    this.dateRange = 'today';
    this.startDate = '';
    this.endDate = '';
    this.statusFilter = '';

    this.resetPageOnFilter = true;
    this.applyFilter();
  }

  // exportCSV() {
  //   const ws = XLSX.utils.json_to_sheet(this.filteredList);
  //   const csv = XLSX.utils.sheet_to_csv(ws);

  //   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  //   const link = document.createElement("a");
  //   link.href = URL.createObjectURL(blob);
  //   link.download = "Schedule_Report.csv";
  //   link.click();
  // }

  exportCSV() {
    if (!this.filteredList.length) {
      this.logger.warn('CSV Export Blocked — No Data');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(this.filteredList);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Schedule_Report.csv";
    link.click();

    this.logger.info('CSV Export Success', this.filteredList.length);
  }


  // Pagination controls
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginate();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginate();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.paginate();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }



  pageSizeChanged() {
    // change pageSize is already two-way bound to pageSize
    // rebuild filteredList & reset page
    this.applyFilter(true);
  }


  // paginate() {
  //   this.totalPages = Math.ceil(this.filteredList.length / this.pageSize);

  //   const start = (this.currentPage - 1) * this.pageSize;
  //   const end = start + this.pageSize;

  //   this.pagedList = this.filteredList.slice(start, end);
  // }

  paginate() {
    if (this.pageSize <= 0) this.pageSize = 5;

    this.totalPages = Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.pagedList = this.filteredList.slice(start, end);
  }


}
