import { Component, ViewChild, AfterViewInit, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import { SchedulerService } from '../../services/scheduler.service';
import { StorageService } from '../../core/services/storage.service';
import { AuthService } from '../../services/auth.service';

/* ---------------- TYPES ---------------- */
interface Slot {
  id: string;
  start: string;
  end: string;
  emergency: boolean;
}

interface Category {
  name: string;
  color: string;
  active: boolean;
}

interface MiniDay {
  day: number | '';
  isToday: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule],
  templateUrl: './scheduler.html',
  styleUrls: ['./scheduler.scss']
})
export class Scheduler implements AfterViewInit, OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly schedulerService = inject(SchedulerService);
  private readonly storage = inject(StorageService);
  private readonly authService = inject(AuthService);

  constructor() { }

  /* ---------------- BACKEND STATE ---------------- */
  userId!: string;
  schedulers: any[] = [];

  userDropdownOpen = false;
  userSearchText = '';

  // repeatOption: 'none' | 'weekly' = 'none';
  repeatOption: 'none' | 'weekly' | 'custom' = 'none';

  /* ---------------- MULTI USER + CUSTOM REPEAT ---------------- */

  users = [
    { id: '1', name: 'Dr. John' },
    { id: '2', name: 'Dr. Priya' },
    { id: '3', name: 'Dr. Mahesh' },
    { id: '4', name: 'Dr. Smith' }
  ];

  selectedUsers: any[] = [];

  repeatWeeks: number = 1;
  customFromDate: string = '';
  customToDate: string = '';


  /* ---------------- BASIC ---------------- */
  title = '';
  description = '';
  selectedDuration = 15;

  durationOptions = [
    { label: '15 minutes', minutes: 15 },
    { label: '30 minutes', minutes: 30 },
    { label: '45 minutes', minutes: 45 },
    { label: '60 minutes', minutes: 60 }
  ];

  fullDayStart = '';
  fullDayEnd = '';
  maxBookingsPerDay?: number;

  categories: Category[] = [
    { name: 'General', color: '#3E7BFA', active: true },
    { name: 'Emergency', color: 'rgb(182,107,0)', active: true }
  ];

  /* ---------------- SAVE / UPDATE ---------------- */
  savedSchedules: {
    title: string;
    description: string;
    daySlots: any[];
  }[] = [];

  editingScheduleIndex: number | null = null;
  private initialSnapshot: string | null = null;

  /* ---------------- DAY SLOTS ---------------- */
  daySlots: {
    label: string;
    unavailable: boolean;
    slots: Slot[];
  }[] = [];

  /* ---------------- CALENDAR ---------------- */
  @ViewChild('calendarRef') calendar!: FullCalendarComponent;

  // calendarOptions: CalendarOptions = {
  //   plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  //   initialView: 'timeGridWeek',
  //   headerToolbar: false,
  //   allDaySlot: false,
  //   slotMinTime: '00:00:00',
  //   slotMaxTime: '24:00:00',
  //   events: [],
  //   eventClick: (info: any) => this.openDrawerForEdit(info)
  // };

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: false,
    allDaySlot: false,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    nowIndicator: true, //Current Time mark on calender

    slotDuration: '00:15:00',
    slotLabelInterval: '01:00',
    eventMinHeight: 24,
    expandRows: true,
    eventOverlap: true,        // ✅ allow overlap
    slotEventOverlap: true,    // ✅ side-by-side stacking

    // ✅ IMPORTANT — 24 HOUR FORMAT
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },

    // ✅ IMPORTANT — remove default time text
    displayEventTime: false,

    events: [],
    // eventClick: (info: any) => this.openDrawerForEdit(info),
    eventClick: (info: any) => {

      const doctorId = info.event.extendedProps['doctorId'];
      const schedulerId = info.event.extendedProps['schedulerId'];

      this.openEditByDoctor(doctorId, schedulerId);
    },

    eventDidMount: (info) => {
      info.el.title = info.event.title;
      const start = new Date(info.event.start!);
      const end = new Date(info.event.end!);
      const duration = (end.getTime() - start.getTime()) / 60000;

      const el = info.el as HTMLElement;

      if (duration <= 15) {
        el.style.fontSize = '10px';
      } else if (duration <= 30) {
        el.style.fontSize = '11px';
      } else {
        el.style.fontSize = '12px';
      }
    }
  };

  openEditByDoctor(doctorId: string, schedulerId: string) {

    const scheduler = this.schedulers.find(s => s._id === schedulerId);

    if (!scheduler) return;

    // load data into form
    this.title = scheduler.title;
    this.description = scheduler.description;
    this.selectedUsers = this.users.filter(u =>
      scheduler.doctorIds.includes(u.id)
    );

    this.daySlots = scheduler.daySlots.map((d: any) => ({
      label: d.dayName,
      unavailable: d.unavailable,
      slots: d.slots.map((s: any) => ({
        id: crypto.randomUUID(),
        start: s.start,
        end: s.end,
        emergency: s.emergency
      }))
    }));

    this.drawerOpen = true;
  }

  currentMonth = '';
  currentDayFullTitle = '';
  currentView = 'timeGridWeek';

  /* ---------------- MINI CALENDAR ---------------- */
  selectedMiniDate = new Date();
  miniMonth = '';
  miniCalendarDays: MiniDay[] = [];

  /* ---------------- UI ---------------- */
  drawerOpen = false;
  isNewEvent = true;
  toastMessage = '';
  toastVisible = false;

  private toastTimer: any;
  private autoGenTimer: any;

  /* ---------------- LIFECYCLE ---------------- */
  ngOnInit() {
    const authUser = this.authService.getCurrentUser();
    if (authUser) {
      this.userId = authUser.userId;
    }
    this.loadFromCache();
    this.loadFromBackend();
  }

  // ngAfterViewInit() {
  //   this.initDaySlots();
  //   this.buildMiniCalendar();
  //   this.updateTitles();
  // }

  ngAfterViewInit() {
    this.initDaySlots();
    this.buildMiniCalendar();
    this.updateTitles();

    setTimeout(() => {
      if (this.schedulers.length > 0) {
        this.syncCalendar();
      }
    }, 500);
  }


  /* ---------------- BACKEND LOADERS ---------------- */
  loadFromCache() {
    const cached = this.storage.getItem<any[]>('schedule_data');
    if (cached) this.schedulers = cached;
  }

  loadFromBackend() {
    this.schedulerService.getSchedulers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: any[]) => {
        this.schedulers = res;
        this.selectedUsers = [...this.users];
        setTimeout(() => {
          if (this.calendar) {
            this.syncCalendar();
          }
        }, 300);
      });
  }

  mapSchedulersToCalendar() {

    if (!this.schedulers.length) return;

    this.initDaySlots();

    this.schedulers.forEach((scheduler: any) => {

      if (!scheduler.daySlots) return;

      scheduler.daySlots.forEach((day: any) => {

        const index = this.getDayIndex(day.dayName);

        if (index === -1) return;

        // merge unavailable
        if (day.unavailable) {
          this.daySlots[index].unavailable = true;
        }

        day.slots.forEach((s: any) => {

          const exists = this.daySlots[index].slots.find(
            slot => slot.start === s.start && slot.end === s.end
          );

          // ✅ avoid duplicates
          if (!exists) {
            this.daySlots[index].slots.push({
              id: crypto.randomUUID(),
              start: s.start,
              end: s.end,
              emergency: s.emergency
            });
          }

        });

      });

    });

    this.syncCalendar();

  }

  getDayIndex(dayName: string): number {

    const map: any = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6
    };

    return map[dayName] ?? -1;
  }

  /* ---------------- INIT ---------------- */
  initDaySlots() {
    const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.daySlots = labels.map(l => ({
      label: l,
      unavailable: false,
      slots: []
    }));
  }

  /* ---------------- UTIL ---------------- */
  private parse(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private fmt(m: number) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private makeSlot(s: string, e: string): Slot {
    return { id: crypto.randomUUID(), start: s, end: e, emergency: false };
  }

  private resolveEnd(): number {
    const e = this.parse(this.fullDayEnd);
    return e === 0 ? 1440 : e;
  }

  private canAutoGenerate(): boolean {
    return !!this.fullDayStart && !!this.fullDayEnd && this.selectedDuration > 0;
  }

  /* ---------------- AUTO GENERATE ---------------- */
  scheduleAutoGenerate() {
    clearTimeout(this.autoGenTimer);
    this.autoGenTimer = setTimeout(() => this.autoGenerateSlots(), 300);
  }

  autoGenerateSlots() {
    if (!this.canAutoGenerate()) return;

    const startM = this.parse(this.fullDayStart);
    const endM = this.resolveEnd();
    if (endM <= startM) return;

    this.daySlots.forEach(d => {
      if (d.unavailable) return;

      const slots: Slot[] = [];
      let cursor = startM;

      while (cursor + this.selectedDuration <= endM) {
        slots.push(this.makeSlot(
          this.fmt(cursor),
          this.fmt(cursor + this.selectedDuration)
        ));
        cursor += this.selectedDuration;
      }

      d.slots = slots;
    });

    this.syncCalendar();
  }

  /* ---------------- SLOT HELPERS ---------------- */
  getCombinedSlots(d: any): Slot[] {
    return d.slots;
  }

  isEmergency(_: any, s: Slot): boolean {
    return s.emergency;
  }

  onSlotChange(_di?: number, _slot?: Slot) {
    this.syncCalendar();
  }

  addSlot(di: number) {
    const d = this.daySlots[di];
    if (d.unavailable) return;

    let start = this.fullDayStart || '00:00';
    if (d.slots.length) start = d.slots[d.slots.length - 1].end;

    const sM = this.parse(start);
    d.slots.push(this.makeSlot(start, this.fmt(sM + this.selectedDuration)));
    this.syncCalendar();
  }

  deleteSlot(di: number, s: Slot) {

    this.daySlots[di].slots =
      this.daySlots[di].slots.filter(x => x.id !== s.id);

    // ✅ FORCE CLEAN STATE
    this.daySlots[di].slots = [...this.daySlots[di].slots];

    this.syncCalendar();
  }

  copySlotsToAllDays(srcIndex: number) {
    const src = this.daySlots[srcIndex];
    this.daySlots.forEach((d, i) => {
      if (i !== srcIndex && !d.unavailable) {
        d.slots = src.slots.map(s => ({ ...s, id: crypto.randomUUID() }));
      }
    });
    this.toast('Slots copied to all days');
    this.syncCalendar();
  }

  /* ---------------- TEMPLATE REQUIRED ---------------- */
  toggleCategory(_: Category) { }

  selectDurationChange(v: number) {
    this.selectedDuration = Number(v) || 15;
    this.scheduleAutoGenerate();
  }

  onFullDayTimeChange() {
    this.scheduleAutoGenerate();
  }

  onMaxBookingsChange(_: number) { }

  toggleDayAvailability(i: number) {
    this.daySlots[i].unavailable = !this.daySlots[i].unavailable;
    this.syncCalendar();
  }

  /* ---------------- SAVE ---------------- */
  onSaveClicked() {
    this.saveSchedulerToBackend();
  }

  onUpdateClicked() {
    this.saveSchedulerToBackend();
  }

  isDuplicateSchedule(newPayload: any): boolean {

    for (let existing of this.schedulers) {

      // ✅ IGNORE SAME SCHEDULER (IMPORTANT FIX)
      if (this.editingScheduleIndex !== null &&
        existing._id === this.schedulers[this.editingScheduleIndex]?._id) {
        continue;
      }

      const sameDoctor = existing.doctorIds.some((d: string) =>
        newPayload.doctorIds.includes(d)
      );

      if (!sameDoctor) continue;

      for (let newDay of newPayload.daySlots) {

        const existingDay = existing.daySlots.find(
          (d: any) => d.date === newDay.date
        );

        if (!existingDay) continue;

        for (let newSlot of newDay.slots) {

          for (let oldSlot of existingDay.slots) {

            if (this.isOverlap(newSlot, oldSlot)) {

              const message =
                `❌ Overlapping slot detected\n\n` +
                `📅 Date: ${newDay.date}\n` +
                `⏰ Existing: ${oldSlot.start} - ${oldSlot.end}\n` +
                `⏰ New: ${newSlot.start} - ${newSlot.end}`;

              console.warn(message);

              alert(message);   // ✅ reliable fallback

              return true;
            }

          }

        }

      }

    }

    return false;
  }

  isOverlap(s1: any, s2: any): boolean {

    const start1 = this.parse(s1.start);
    const end1 = this.parse(s1.end);

    const start2 = this.parse(s2.start);
    const end2 = this.parse(s2.end);

    return start1 < end2 && start2 < end1;
  }

  saveSchedulerToBackend() {

    if (!this.validateSlots()) return;

    if (!this.title) {
      alert("Please enter title");
      return;
    }

    if (this.selectedUsers.length === 0) {
      alert("Please select at least one user");
      return;
    }

    const daySlotsPayload = this.daySlots.map((d, index) => {

      const today = this.calendar.getApi().getDate();

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + (index - today.getDay()));

      return {
        dayName: d.label,
        date: targetDate.toISOString().split('T')[0],
        unavailable: d.unavailable,
        slots: d.slots.map(s => ({
          start: s.start,
          end: s.end,
          emergency: s.emergency
        }))
      };

    });

    const payload = {
      title: this.title,
      doctorIds: this.selectedUsers.map(u => u.id),
      appointmentDuration: this.selectedDuration,

      repeatType:
        this.repeatOption === 'none' ? 0 :
          this.repeatOption === 'weekly' ? 1 : 2,

      repeatWeeks: this.repeatWeeks || null,
      customFromDate: this.customFromDate || null,
      customToDate: this.customToDate || null,

      fullDayStart: this.fullDayStart,
      fullDayEnd: this.fullDayEnd,
      maxBookingsPerDay: this.maxBookingsPerDay,

      daySlots: daySlotsPayload,
      description: this.description
    };



    // ✅ FIX: delay ONLY validation, not API
    Promise.resolve().then(() => {

      if (this.isDuplicateSchedule(payload)) {
        return;
      }

      this.schedulerService.saveScheduler(payload)
        .subscribe({
          next: (res: any) => {

            this.toast('Schedule saved successfully');
            this.drawerOpen = false;

            this.mergeScheduler(res);
            this.syncCalendar();
            this.loadFromBackend();

            this.resetForm();
          },
          error: (err) => {
            console.error(err);
            alert("Failed to save schedule");
          }
        });

    });
  }

  resetForm() {
    this.title = '';
    this.description = '';
    this.selectedUsers = [];
    this.fullDayStart = '';
    this.fullDayEnd = '';
    this.daySlots = [];
    this.initDaySlots();
  }

  validateSlots(): boolean {

    for (let d of this.daySlots) {

      const sorted = [...d.slots].sort((a, b) =>
        a.start.localeCompare(b.start)
      );

      for (let i = 0; i < sorted.length - 1; i++) {

        const currentEnd = sorted[i].end;
        const nextStart = sorted[i + 1].start;

        if (currentEnd > nextStart) {
          alert(`Overlapping slot in ${d.label}`);
          return false;
        }
      }
    }

    return true;
  }

  mergeScheduler(updated: any) {
    const idx = this.schedulers.findIndex(
      s => s._id === updated._id   // ✅ FIXED
    );

    if (idx > -1) {
      this.schedulers[idx] = updated;
    } else {
      this.schedulers.push(updated);
    }

    localStorage.setItem('schedule_data', JSON.stringify(this.schedulers));
  }

  /* ---------------- CALENDAR ---------------- */
  calendarEvents: EventInput[] = [];


  syncCalendar() {

    if (!this.calendar) return;

    const api = this.calendar.getApi();
    api.removeAllEvents();

    this.calendarEvents = [];

    const selectedIds = this.selectedUsers.map(u => u.id);

    this.schedulers.forEach((scheduler: any) => {

      // ✅ doctor filter
      if (selectedIds.length > 0) {
        const match = scheduler.doctorIds?.some((d: string) =>
          selectedIds.includes(d)
        );
        if (!match) return;
      }

      if (!scheduler.daySlots) return;

      scheduler.daySlots.forEach((day: any) => {

        if (day.unavailable) return;

        const date = new Date(day.date + 'T00:00:00');

        day.slots.forEach((slot: any) => {

          const [sh, sm] = slot.start.split(':').map(Number);
          const [eh, em] = slot.end.split(':').map(Number);

          const startTime = new Date(date);
          startTime.setHours(sh, sm, 0, 0);

          const endTime = new Date(date);
          endTime.setHours(eh, em, 0, 0);

          // ✅ LOOP EACH DOCTOR
          scheduler.doctorIds.forEach((docId: string) => {

            // filter check
            if (this.selectedUsers.length > 0) {
              const selectedIds = this.selectedUsers.map(u => u.id);
              if (!selectedIds.includes(docId)) return;
            }

            this.calendarEvents.push({
              id: crypto.randomUUID(),

              title: `${this.getDoctorName(docId)} (${slot.start}-${slot.end})`,

              start: startTime,
              end: endTime,

              backgroundColor: this.getDoctorColor(docId),
              borderColor: this.getDoctorColor(docId),

              extendedProps: {
                doctorId: docId,
                schedulerId: scheduler._id,
                slot: slot
              },

              className: slot.emergency ? 'fc-emergency' : 'fc-general'
            });

          });

        });

      });

    });

    api.addEventSource(this.calendarEvents);
  }

  getDoctorName(id: string) {
    return this.users.find(u => u.id === id)?.name || id;
  }

  getDoctorColor(id: string) {
    const map: any = {
      '1': '#3E7BFA',
      '2': '#28a745',
      '3': '#ff9800',
      '4': '#e91e63'
    };
    return map[id] || '#999';
  }


  /* ---------------- DRAWER ---------------- */
  openDrawerForAdd() {
    this.isNewEvent = true;
    this.drawerOpen = true;
    this.captureSnapshot();
  }

  onAddButtonClicked() {
    this.calendar.getApi().changeView('timeGridWeek');
    this.currentView = 'timeGridWeek';
    this.updateTitles();
    this.openDrawerForAdd();
  }

  openDrawerForEdit(_: any) {
    this.isNewEvent = false;
    this.drawerOpen = true;
    this.captureSnapshot();
  }

  private captureSnapshot() {
    this.initialSnapshot = JSON.stringify({
      title: this.title,
      description: this.description,
      daySlots: this.daySlots
    });
  }

  closeDrawer() {
    this.drawerOpen = false;
    this.initialSnapshot = null;
  }

  deleteEvent() {
    if (!confirm('Delete this schedule?')) return;
    this.toast('Deleted');
    this.closeDrawer();
  }

  /* ---------------- HEADER ---------------- */
  changeView(v: string) {
    this.currentView = v;
    this.calendar.getApi().changeView(v);
    this.updateTitles();
  }

  prev() {
    this.calendar.getApi().prev();
    this.updateTitles();
  }

  next() {
    this.calendar.getApi().next();
    this.updateTitles();
  }

  updateTitles() {
    const d = this.calendar.getApi().getDate();
    this.currentMonth = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    this.currentDayFullTitle = d.toLocaleString('default', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // onUserSelectionChange(event: any, user: any) {
  //   if (event.target.checked) {
  //     this.selectedUsers.push(user);
  //   } else {
  //     this.selectedUsers =
  //       this.selectedUsers.filter(u => u.id !== user.id);
  //   }
  // }


  /* ---------------- MINI CALENDAR ---------------- */
  buildMiniCalendar() {
    const y = this.selectedMiniDate.getFullYear();
    const m = this.selectedMiniDate.getMonth();

    this.miniMonth = this.selectedMiniDate.toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });

    const days = new Date(y, m + 1, 0).getDate();
    const start = new Date(y, m, 1).getDay();
    const today = new Date();

    this.miniCalendarDays = [];

    for (let i = 0; i < start; i++) {
      this.miniCalendarDays.push({ day: '', isToday: false, isSelected: false });
    }

    for (let d = 1; d <= days; d++) {
      this.miniCalendarDays.push({
        day: d,
        isToday:
          d === today.getDate() &&
          m === today.getMonth() &&
          y === today.getFullYear(),
        isSelected: false
      });
    }
  }

  prevMini() {
    this.selectedMiniDate.setMonth(this.selectedMiniDate.getMonth() - 1);
    this.buildMiniCalendar();
  }

  nextMini() {
    this.selectedMiniDate.setMonth(this.selectedMiniDate.getMonth() + 1);
    this.buildMiniCalendar();
  }

  miniDateClick(d: MiniDay) {
    if (!d.day) return;

    this.miniCalendarDays.forEach(x => x.isSelected = false);
    d.isSelected = true;

    const selected = new Date(
      this.selectedMiniDate.getFullYear(),
      this.selectedMiniDate.getMonth(),
      d.day
    );

    this.calendar.getApi().gotoDate(selected);
    this.updateTitles();
  }

  /* ---------------- TOAST ---------------- */
  private toast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastVisible = false), 1800);
  }

  onRepeatChange() {

    if (this.repeatOption === 'custom') {
      this.calendar.getApi().changeView('dayGridMonth');
    }

    if (this.repeatOption === 'weekly') {
      this.calendar.getApi().changeView('timeGridWeek');
    }

    this.syncCalendar();
    this.calendar.getApi().changeView('timeGridWeek');
    this.currentView = 'timeGridWeek';
    this.updateTitles();

  }

  toggleUserDropdown() {
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  filteredUsers() {
    return this.users.filter(u =>
      u.name.toLowerCase().includes(this.userSearchText.toLowerCase())
    );
  }

  isUserSelected(user: any): boolean {
    return this.selectedUsers.some(u => u.id === user.id);
  }

  onUserCheckboxChange(event: any, user: any) {
    if (event.target.checked) {
      this.selectedUsers.push(user);
    } else {
      this.selectedUsers =
        this.selectedUsers.filter(u => u.id !== user.id);
    }

    // ✅ IMPORTANT
    this.syncCalendar();
  }

  isAllSelected(): boolean {
    const filtered = this.filteredUsers();

    if (filtered.length === 0) return false;

    return filtered.every(user =>
      this.selectedUsers.some(u => u.id === user.id)
    );
  }

  toggleSelectAll(event: any) {

    const filtered = this.filteredUsers();

    if (event.target.checked) {
      filtered.forEach(user => {
        if (!this.isUserSelected(user)) {
          this.selectedUsers.push(user);
        }
      });
    } else {
      this.selectedUsers = this.selectedUsers.filter(
        u => !filtered.some(f => f.id === u.id)
      );
    }

    // ✅ IMPORTANT
    this.syncCalendar();
  }

}
