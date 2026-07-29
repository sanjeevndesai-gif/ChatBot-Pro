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
  // Default to show all dates so reports display incoming data by default
  dateRange: string = '';
  startDate: string = '';
  endDate: string = '';
  statusFilter: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  pagedList: ScheduleItem[] = [];

  // Sorting
  sortKey: string = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  // Prevent unwanted page reset
  resetPageOnFilter: boolean = true;

  schedules: ScheduleItem[] = [];

  filteredList: ScheduleItem[] = [];

  // Modal state for Not Reported reason
  showNotReportedModal: boolean = false;
  modalItem: ScheduleItem | null = null;
  modalReason: string = '';

  statusConfig: any = {
    'Active': { badge: 'bg-primary', icon: 'bi-check-circle' },
    'Completed': { badge: 'bg-success', icon: 'bi-check2-all' },
    'Pending': { badge: 'bg-warning text-dark', icon: 'bi-hourglass-split' },
    'Cancelled': { badge: 'bg-danger', icon: 'bi-x-circle' },
    'Inactive': { badge: 'bg-secondary', icon: 'bi-slash-circle' }
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

  refreshFromApi() {
    try {
      // Clear stored cache keys used by ScheduleService and reload
      localStorage.removeItem('schedules');
      localStorage.removeItem('schedules_version');
      this.logger.info('Cleared local schedule cache; reloading from API');
    } catch (e) {
      this.logger.warn('Could not clear local cache', e);
    }
    this.loadFromApi();
  }

  initData() {
    // Prefer fresh data from API on page load; fall back to cache on error
    this.loadFromApi();
  }

  loadFromApi() {
    this.scheduleService.fetchSchedules().subscribe({
      next: (data) => {
        try {
          // eslint-disable-next-line no-console
          console.log('ScheduleReport: raw API response', data);
        } catch (e) {}

        this.schedules = this.scheduleService.processApiData(data);
        try {
          // eslint-disable-next-line no-console
          console.log('ScheduleReport: processed schedules', this.schedules);
        } catch (e) {}
        this.logger.info('Loaded data from API', this.schedules.length);
        this.applyFilter();
      },
      error: (err) => {
        try {
          // eslint-disable-next-line no-console
          console.error('ScheduleReport: API error', err);
        } catch (e) {}
        this.logger.error('API Failed — using cache', err);
        this.schedules = this.scheduleService.loadFromLocal();
        this.applyFilter();
      }
    });
  }

  // Toggle sorting by header key
  sortBy(key: string) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.applyFilter(false);
  }

  private applySort(list: ScheduleItem[]): ScheduleItem[] {
    const key = this.sortKey;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va: any = (a as any)[key] ?? '';
      const vb: any = (b as any)[key] ?? '';

      // Special cases
      if (key === 'date') {
        const da = this.toDate(va || a.date).getTime();
        const db = this.toDate(vb || b.date).getTime();
        if (da !== db) return (da - db) * dir;
        // tie-break by slot ascending
        return (this.convertToMinutes(a.slot) - this.convertToMinutes(b.slot)) * dir;
      }
      if (key === 'slot') {
        return (this.convertToMinutes(va) - this.convertToMinutes(vb)) * dir;
      }

      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return -1 * dir;
      if (sa > sb) return 1 * dir;
      return 0;
    });
  }

  markReported(item: ScheduleItem) {
    // Prefer appointmentNumber for updates so backend can locate record by business id
    const id = item.appointmentNumber || item.rawId || item.id;
    const payload = { ...item, reportStatus: 'Reported', reportReason: '' };

    // Log that we're about to send update
    try {
      this.logger.info('Sending Reported update', { appointmentNumber: item.appointmentNumber, id, payload });
      // eslint-disable-next-line no-console
      console.log('Schedulereport.markReported ->', { appointmentNumber: item.appointmentNumber, id, payload });
    } catch (e) {}

    this.scheduleService.updateAppointment(id, payload).subscribe({
      next: (res) => {
        this.logger.info('Marked reported', item.appointmentNumber || item.id);
        // eslint-disable-next-line no-console
        console.log('Schedulereport.markReported response', res);
        // Refresh data from backend so UI reflects server-side status updates
        this.loadFromApi();
      },
      error: (err) => {
        this.logger.error('Failed to mark reported', err);
        // eslint-disable-next-line no-console
        console.error('Schedulereport.markReported error', err);
        try { console.error('markReported error', err); } catch(e) {}
      }
    });
  }

  markNotReported(item: ScheduleItem) {
    // kept for compatibility; prefer openNotReportedModal which shows a nicer UI
    const reason = prompt('Reason for Not Reported:', item.reportReason || '');
    if (reason === null) return; // cancelled
    this.applyNotReported(item, reason);
  }

  openNotReportedModal(item: ScheduleItem) {
    this.modalItem = item;
    this.modalReason = item.reportReason || '';
    this.showNotReportedModal = true;
  }

  submitNotReportedModal() {
    if (!this.modalItem) return;
    const reason = this.modalReason ?? '';
    this.showNotReportedModal = false;
    this.applyNotReported(this.modalItem, reason);
    this.modalItem = null;
    this.modalReason = '';
  }

  closeNotReportedModal() {
    this.showNotReportedModal = false;
    this.modalItem = null;
    this.modalReason = '';
  }

  private applyNotReported(item: ScheduleItem, reason: string) {
    // Prefer appointmentNumber for updates so backend can locate record by business id
    const id = item.appointmentNumber || item.rawId || item.id;
    const payload = { ...item, reportStatus: 'Not Reported', reportReason: reason };

    // Log outgoing not-reported update
    try {
      this.logger.info('Sending Not Reported update', { appointmentNumber: item.appointmentNumber, id, payload });
      // eslint-disable-next-line no-console
      console.log('Schedulereport.applyNotReported ->', { appointmentNumber: item.appointmentNumber, id, payload });
    } catch (e) {}

    this.scheduleService.updateAppointment(id, payload).subscribe({
      next: (res) => {
        this.logger.info('Marked not reported', item.appointmentNumber || item.id);
        // eslint-disable-next-line no-console
        console.log('Schedulereport.applyNotReported response', res);
        // Refresh data from backend so UI reflects server-side status updates
        this.loadFromApi();
      },
      error: (err) => {
        this.logger.error('Failed to mark not reported', err);
        // eslint-disable-next-line no-console
        console.error('Schedulereport.applyNotReported error', err);
        try { console.error('markNotReported error', err); } catch(e) {}
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
        this.safe(item.appointmentNumber).includes(text) ||
        this.safe(item.id).includes(text) ||
        this.safe(item.name).includes(text) ||
        this.safe((item as any).doctorName).includes(text) ||
        this.safe(item.status).includes(text) ||
        this.safe(item.date).includes(text) ||
        this.safe(item.slot).includes(text);



      const matchesStatus = this.statusFilter ? item.status === this.statusFilter : true;

      return matchesText && matchesDate && matchesStatus;
    });

    // Sort (use current sortKey & sortDir)
    this.filteredList = this.applySort(this.filteredList);

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

    // Build export rows excluding `id` (orgId) and including phone/report fields
    const rows = this.filteredList.map(i => ({
      appointmentNumber: i.appointmentNumber || i.id || '',
      name: i.name,
      doctorName: i.doctorName || '',
      date: i.date,
      slot: i.slot,
      status: i.status,
      phone: i.phone || '',
      reportStatus: i.reportStatus || 'Reported',
      reportReason: i.reportReason || ''
    }));

    // Sort rows by date desc then slot
    const parseDateStr = (s: string): Date => {
      if (!s) return new Date(0);
      const parts = s.split('/');
      if (parts.length === 3) {
        const d = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const y = Number(parts[2]);
        return new Date(y, m, d);
      }
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? new Date(0) : dt;
    };

    const convertSlotToMinutes = (slot: string): number => {
      if (!slot) return 0;
      const start = slot.split(' - ')[0];
      const parts = start.split(' ');
      let hhmm = parts[0] || '';
      let period = parts[1] || '';
      const [hh, mm] = hhmm.split(':').map(Number);
      let h = Number.isFinite(hh) ? hh : 0;
      const m = Number.isFinite(mm) ? mm : 0;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    rows.sort((a, b) => {
      const da = parseDateStr(a.date).getTime();
      const db = parseDateStr(b.date).getTime();
      if (da !== db) return db - da; // desc
      return convertSlotToMinutes(a.slot) - convertSlotToMinutes(b.slot);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Header styling (bold)
    const header = Object.keys(rows[0] || {});
    header.forEach((h, idx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: idx });
      if (!ws[cellAddress]) return;
      // Uppercase header text
      ws[cellAddress].v = String(ws[cellAddress].v || '').toUpperCase();
      ws[cellAddress].t = 's';
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: 'FF2F80ED' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      } as any;
    });

    // Column widths
    ws['!cols'] = [
      { wch: 24 }, // appointmentNumber
      { wch: 20 }, // name
      { wch: 20 }, // doctorName
      { wch: 12 }, // date
      { wch: 18 }, // slot
      { wch: 12 }, // status
      { wch: 18 }, // phone
      { wch: 14 }, // reportStatus
      { wch: 30 }  // reportReason
    ];

    // Ensure phone column is treated as text to preserve formatting
    for (let r = 1; r <= rows.length; r++) {
      const phoneCell = XLSX.utils.encode_cell({ r, c: 5 });
      if (ws[phoneCell]) {
        ws[phoneCell].t = 's';
        ws[phoneCell].v = String(ws[phoneCell].v || '');
      }
    }

    // Apply thin borders to all cells in used range
    try {
      const ref = ws['!ref'];
      if (ref) {
        const range = XLSX.utils.decode_range(ref);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = ws[cellAddress].s || {} as any;
            (ws[cellAddress].s as any).border = {
              top: { style: 'thin', color: { rgb: 'FF000000' } },
              bottom: { style: 'thin', color: { rgb: 'FF000000' } },
              left: { style: 'thin', color: { rgb: 'FF000000' } },
              right: { style: 'thin', color: { rgb: 'FF000000' } }
            } as any;
          }
        }
      }
    } catch (e) {
      // style application may fail in some environments; ignore
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Schedule Report');

    // Write workbook and trigger download
    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Schedule_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.click();
      this.logger.info('XLSX Export Success', this.filteredList.length);
    } catch (e) {
      // Fallback to CSV if xlsx write fails
      const fallbackWs = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(fallbackWs);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Schedule_Report.csv';
      link.click();
      this.logger.warn('XLSX Export failed; fell back to CSV', e);
    }
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
