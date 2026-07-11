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
import { UserService } from '../../services/user.service';

/* ---------------- TYPES ---------------- */
interface Slot {
  slotId?: string;
  start: string;
  end: string;
  type: string;
  booked: boolean;
  maxBookings: number;
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

  toggleResourceFilterDropdown() {
    this.resourceFilterDropdownOpen =
      !this.resourceFilterDropdownOpen;
  }

  toggleScheduleResourceDropdown() {
    this.scheduleResourceDropdownOpen =
      !this.scheduleResourceDropdownOpen;
  }

  dateError: string = '';
  onFromDateChange() {
    this.dateError = '';
    // Prevent selecting a date less than today
    if (this.customFromDate && this.customFromDate < this.todayString) {
      this.dateError = 'From Date cannot be less than today.';
      this.customFromDate = this.todayString;
    }
    // Prevent selecting a to-date less than from-date
    if (this.customToDate && this.customToDate < this.customFromDate) {
      this.dateError = 'To Date cannot be less than From Date.';
      this.customToDate = this.customFromDate;
    }
  }

  // Helper for template: get min date for from date input
  get minFromDate() {
    return this.todayString;
  }
  onToDateChange() {
    this.dateError = '';
    if (this.customFromDate && this.customToDate) {
      // Calculate minimum allowed ToDate (10 days after FromDate)
      const fromDate = new Date(this.customFromDate);
      const minToDate = new Date(fromDate);
      minToDate.setDate(fromDate.getDate() + 10);
      const minToDateString = this.formatYMD(minToDate);
      if (this.customToDate < minToDateString) {
        this.dateError = `To Date must be at least 10 days after From Date (${minToDateString} or later).`;
        this.customToDate = minToDateString;
      }
    }
  }

  // Helper for template: get min date for to date input
  get minToDate() {
    if (!this.customFromDate) return this.todayString;
    const fromDate = new Date(this.customFromDate);
    fromDate.setDate(fromDate.getDate() + 10);
    return this.formatYMD(fromDate);
  }
  todayString: string = this.formatYMD(new Date());
  maxToDateString: string = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return this.formatYMD(d);
  })();

  private readonly destroyRef = inject(DestroyRef);
  private readonly schedulerService = inject(SchedulerService);
  private readonly storage = inject(StorageService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  // UI state
  resourceFilterDropdownOpen = false;
  scheduleResourceDropdownOpen = false;

  // Scheduler state
  users: any[] = [];
  // stored fallback (all doctors) — only shown if user explicitly requests
  fallbackUsers: any[] = [];
  schedulers: any[] = [];
  selectedResources: any[] = [];
  showAllDoctorsFallback = false;
  title = '';
  userSearchText = '';
  repeatOption: 'none' | 'weekly' | 'custom' = 'none';
  repeatWeeks = 1;
  customFromDate = '';
  customToDate = '';
  userId = '';
  // timers
  

  description = '';
  status = 'ACTIVE';
  timezone = 'Asia/Kolkata';
  createdBy = '';
  updatedBy = '';
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
  selectedScheduler: any = null;
  isFullScheduleEdit = false;
  private initialSnapshot: string | null = null;

  /* ---------------- DAY SLOTS ---------------- */
  daySlots: {
    date: string;
    displayDay: string;
    unavailable: boolean;
    expanded?: boolean;
    slots: Slot[];
  }[] = [];

  // Section-level expand/collapse for Day-wise Slots
  daywiseExpanded = false;

  toggleDaywiseExpand() {
    this.daywiseExpanded = !this.daywiseExpanded;
  }

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
    // Note: removed hard `validRange` start to allow showing schedules
    // that may have dates before today. This ensures newly-created
    // schedules with explicit dates are visible in the calendar.
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'customWeek',
    headerToolbar: false,
    allDaySlot: false,
    // Show business hours from 08:00 to 22:00
    slotMinTime: '08:00:00',
    slotMaxTime: '22:00:00',
    // Start scroll position at morning 08:00
    scrollTime: '08:00:00',
    nowIndicator: true, //Current Time mark on calender

    slotDuration: '00:15:00',
    slotLabelInterval: '01:00',
    eventMinHeight: 24,
    expandRows: true,
    eventOverlap: false,        // ✅ Not allow overlap
    slotEventOverlap: false,    // ✅ side-by-side stacking

    // ✅ IMPORTANT — 24 HOUR FORMAT
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },

    // Use FullCalendar's standard week/month views (will show the week/month containing today)
    views: {
      // custom week that always starts at today and shows 7 days
      customWeek: {
        type: 'timeGrid',
        duration: { days: 7 },
        buttonText: 'Week',
        visibleRange: (currentDate) => {
          const start = new Date();
          start.setHours(0,0,0,0);
          const end = new Date(start);
          end.setDate(start.getDate() + 7);
          return { start, end };
        }
      },
      timeGridWeek: {},
      dayGridMonth: { dayMaxEventRows: 3 }
    },

    eventClassNames: (arg: any) => {

      const schedulerId =
        arg.event.extendedProps['schedulerId'];

      const resourceId =
        arg.event.extendedProps['resourceId'];

      const slotId =
        arg.event.extendedProps['originalSlotId'];

      const isSelected =

        this.selectedSlots.some(
          s =>

            s.schedulerId ===
            schedulerId

            &&

            s.resourceId ===
            resourceId

            &&

            s.slotId ===
            slotId
        );

      return isSelected
        ? ['selected-slot']
        : [];
    },

    // ✅ IMPORTANT — remove default time text
    displayEventTime: false,

    events: [],
    eventClick: (info: any) => {

      const resourceId = info.event.extendedProps['resourceId'];

      // const slotId = info.event.extendedProps['slotId'];
      const slotId = info.event.extendedProps['originalSlotId'];

      const schedulerId = info.event.extendedProps['schedulerId'];

      // MULTI DELETE MODE
      if (this.multiDeleteMode) {

        const selectedSlot = {

          schedulerId,

          resourceId,

          slotId
        };

        const alreadySelected =

          this.selectedSlots.some(
            s =>

              s.schedulerId ===
              schedulerId

              &&

              s.resourceId ===
              resourceId

              &&

              s.slotId ===
              slotId
          );

        if (alreadySelected) {

          this.selectedSlots =

            this.selectedSlots.filter(
              s => !(

                s.schedulerId ===
                schedulerId

                &&

                s.resourceId ===
                resourceId

                &&

                s.slotId ===
                slotId
              )
            );

          this.syncCalendar();

        } else {

          this.selectedSlots.push(
            selectedSlot
          );
          this.syncCalendar();

        }

        return;
      }

      const slotProp = info.event.extendedProps && info.event.extendedProps['slot'];
      const titleWithTime = `${info.event.title}${slotProp?.start && slotProp?.end ? ' (' + slotProp.start + '-' + slotProp.end + ')' : ''}`;

      this.selectedEventData = {
        schedulerId,
        resourceId,
        slotId,
        originalSlotId: info.event.extendedProps['originalSlotId'],
        title: titleWithTime,
        event: info.event
      };
      this.slotActionPopup = true;
    },
    eventDidMount: (info) => {
      // set tooltip (include time) and compact font sizing
      try {
        const slotProp = info.event.extendedProps && info.event.extendedProps['slot'];
        const startText = slotProp?.start || '';
        const endText = slotProp?.end || '';
        info.el.title = `${info.event.title}${startText && endText ? ' (' + startText + '-' + endText + ')' : ''}`;
      } catch (e) {
        info.el.title = info.event.title;
      }
      const start = new Date(info.event.start!);
      const end = new Date(info.event.end!);
      const duration = (end.getTime() - start.getTime()) / 60000;

      const el = info.el as HTMLElement;

      if (duration <= 15) {
        el.style.fontSize = '11px';
      } else if (duration <= 30) {
        el.style.fontSize = '12px';
      } else {
        el.style.fontSize = '13px';
      }

      // apply color classes for nicer cards (if not already present)
      const type = info.event.extendedProps['type'] || info.event.extendedProps['category'] || 'GENERAL';
      if (type === 'EMERGENCY') {
        el.classList.add('fc-event-emergency');
      } else {
        el.classList.add('fc-event-general');
      }

      // Add a small avatar (image or initials) to week (timeGrid) event cards when possible
      try {
        const resourceId = info.event.extendedProps['resourceId'];
        const user = this.users ? this.users.find((u: any) => u.id === resourceId) : null;

        let avatarEl: HTMLElement | null = null;

        if (user) {
          avatarEl = document.createElement('span');
          avatarEl.className = 'event-avatar';

          // prefer explicit photo field, then avatarUrl for backward compat
          const src = user.photo || user.avatarUrl || null;
          if (src) {
            const img = document.createElement('img');
            img.src = src;
            img.alt = user.name || '';
            avatarEl.appendChild(img);
          } else {
            const initials = (user.name || '')
              .split(' ')
              .map((s: string) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            avatarEl.textContent = initials;
          }

          // prepend avatar only for timeGrid (week/day) events
          if (el.classList.contains('fc-timegrid-event')) {
            el.prepend(avatarEl);
          } else {
            // for dayGrid events, try to insert into inner main element
            const main = el.querySelector('.fc-event-main') as HTMLElement | null;
            if (main) main.prepend(avatarEl);
          }
        }
      } catch (e) {
        // ignore avatar errors — do not break rendering
      }
    }
  };

  closeSlotPopup() {
    this.slotActionPopup = false;
    this.selectedEventData = null;
  }

  editResourceSchedule() {
    const schedulerId = this.selectedEventData.schedulerId;
    const resourceId = this.selectedEventData.resourceId;
    const scheduler = this.schedulers.find((s: any) => (s.id || s._id) === schedulerId);

    if (!scheduler) return;

    const resourceSchedule =
      scheduler.resourceSchedules.find((r: any) => r.resourceId === resourceId);

    if (!resourceSchedule)
      return;

    this.isNewEvent = false;
    this.isFullScheduleEdit = false;
    this.selectedScheduler = scheduler;

    this.selectedResources = this.users.filter(u => u.id === resourceId);

    this.daySlots = resourceSchedule.daySlots.map((d: any) => ({
      date: d.date,
      displayDay: new Date(d.date)
        .toLocaleDateString(
          'en-US',
          { weekday: 'long' }
        ),
      unavailable:
        d.unavailable,
      slots:
        d.slots.map(
          (s: any) => ({
            slotId: s.slotId,
            start: s.start,
            end: s.end,
            type: s.type || 'GENERAL',
            booked: s.booked || false,
            maxBookings: s.maxBookings || 1
          }))
    })
    );

    this.title = scheduler.title;
    this.description = scheduler.description;
    this.drawerOpen = true;
    this.closeSlotPopup();
    // copy scheduler-level metadata so updates preserve repeat settings
    this.repeatOption =
      scheduler.repeatType === 0 ? 'none' : scheduler.repeatType === 1 ? 'weekly' : 'custom';
    this.repeatWeeks = scheduler.repeatWeeks || 1;
    this.customFromDate = scheduler.customFromDate || '';
    this.customToDate = scheduler.customToDate || '';
    this.fullDayStart = scheduler.fullDayStart || '';
    this.fullDayEnd = scheduler.fullDayEnd || '';
    this.maxBookingsPerDay = scheduler.maxBookingsPerDay || 1;
    this.status = scheduler.status || 'ACTIVE';
    this.timezone = scheduler.timezone || 'Asia/Kolkata';
  }

  editFullSchedule() {

    const schedulerId =
      this.selectedEventData.schedulerId;

    const scheduler =
      this.schedulers.find(
        (s: any) =>
          (s.id || s._id)
          === schedulerId
      );

    if (!scheduler)
      return;

    this.isNewEvent = false;
    this.isFullScheduleEdit = true;

    this.selectedScheduler =
      scheduler;

    // LOAD ALL RESOURCES
    this.selectedResources =

      scheduler.resourceSchedules
        .map((r: any) =>

          this.users.find(
            u =>
              u.id ===
              r.resourceId
          )
        )

        .filter(Boolean);

    // LOAD FIRST RESOURCE daySlots
    // because all schedules share same slot structure
    if (
      !scheduler.resourceSchedules
      || scheduler.resourceSchedules.length === 0
    ) {
      alert('No resource schedules found');
      return;
    }

    const firstResource =
      scheduler.resourceSchedules[0];

    this.daySlots =

      firstResource.daySlots.map(
        (d: any) => ({

          date: d.date,

          displayDay:
            new Date(d.date)
              .toLocaleDateString(
                'en-US',
                {
                  weekday: 'long'
                }
              ),

          unavailable:
            d.unavailable,

          slots:
            d.slots.map(
              (s: any) => ({

                slotId:
                  s.slotId,

                start:
                  s.start,

                end:
                  s.end,

                type:
                  s.type || 'GENERAL',

                booked:
                  s.booked || false,

                maxBookings:
                  s.maxBookings || 1
              }))
        })
      );

    // scheduler fields
    this.title =
      scheduler.title || '';

    this.description =
      scheduler.description || '';

    this.selectedDuration =
      scheduler.appointmentDuration;

    this.repeatOption =

      scheduler.repeatType === 0
        ? 'none'

        : scheduler.repeatType === 1
          ? 'weekly'

          : 'custom';

    this.repeatWeeks =
      scheduler.repeatWeeks || 1;

    this.customFromDate =
      scheduler.customFromDate || '';

    this.customToDate =
      scheduler.customToDate || '';

    this.fullDayStart =
      scheduler.fullDayStart || '';

    this.fullDayEnd =
      scheduler.fullDayEnd || '';

    this.maxBookingsPerDay =
      scheduler.maxBookingsPerDay || 1;

    this.status =
      scheduler.status || 'ACTIVE';

    this.timezone =
      scheduler.timezone
      || 'Asia/Kolkata';

    this.drawerOpen = true;

    this.closeSlotPopup();
  }

  deleteClickedSlot() {
    const {
      schedulerId,
      resourceId,
      originalSlotId
    } = this.selectedEventData;

    // Extract event date (if present) so we can delete only the specific
    // instance of a repeated slot rather than all occurrences sharing the
    // same prototype `slotId`.
    const ev = this.selectedEventData?.event;
    const evDate = ev?.extendedProps?.date;

    // If we have a direct canonical slot id (`originalSlotId`) use the simple
    // delete API and include the date to restrict deletion to that day.
    if (originalSlotId) {
      this.deleteSingleSlot(
        schedulerId,
        resourceId,
        originalSlotId,
        evDate
      );
      this.closeSlotPopup();
      return;
    }

    // Fallback: attempt to find the matching slot in the loaded schedulers by
    // comparing date + start + end from the selected event.
    const slotProp = ev?.extendedProps?.slot;

    if (!ev || !slotProp || !evDate) {
      alert('Unable to determine slot to delete');
      this.closeSlotPopup();
      return;
    }

    if (!confirm('Delete this slot?')) {
      this.closeSlotPopup();
      return;
    }

    // Find scheduler and remove matching slot by start/end/date for the resource
    const schedIndex = this.schedulers.findIndex((s: any) => (s.id || s._id) === schedulerId);
    if (schedIndex === -1) {
      alert('Scheduler not found locally');
      this.closeSlotPopup();
      return;
    }

    // Deep clone the scheduler object to avoid mutating UI state before server
    const schedulerClone = JSON.parse(JSON.stringify(this.schedulers[schedIndex]));

    let removed = false;
    const rs = schedulerClone.resourceSchedules || [];
    for (const resource of rs) {
      if (resource.resourceId !== resourceId) continue;
      const daySlots = resource.daySlots || [];
      for (const day of daySlots) {
        if (day.date !== evDate) continue;
        const before = (day.slots || []).length;
        day.slots = (day.slots || []).filter((s: any) => !(s.start === slotProp.start && s.end === slotProp.end));
        if (day.slots.length !== before) removed = true;
      }
    }

    if (!removed) {
      alert('No matching slot found to delete');
      this.closeSlotPopup();
      return;
    }

    // Send full scheduler update to persist the removal
    this.schedulerService.updateScheduler(schedulerId, schedulerClone).subscribe({
      next: () => {
        // Refresh canonical data from backend
        this.loadFromBackend();
        this.toast('Slot deleted');
      },
      error: (err) => {
        console.error(err);
        alert('Failed to delete slot');
      }
    });

    this.closeSlotPopup();
  }

  deleteResourceSchedule() {

    const confirmed =
      confirm(
        'Delete this resource schedule?'
      );

    if (!confirmed) return;

    const {
      schedulerId,
      resourceId
    } = this.selectedEventData;

    this.schedulerService
      .deleteResourceSchedule(
        schedulerId,
        resourceId
      )
      .subscribe({

        next: () => {

          // remove locally
          this.schedulers =
            this.schedulers
              .map((scheduler: any) => {

                if (
                  (scheduler.id || scheduler._id)
                  !== schedulerId
                ) {
                  return scheduler;
                }

                scheduler.resourceSchedules =
                  scheduler.resourceSchedules.filter(
                    (r: any) =>
                      r.resourceId !== resourceId
                  );

                return scheduler;
              })

              // remove empty schedulers
              .filter(
                (scheduler: any) =>
                  scheduler.resourceSchedules.length > 0
              );

          this.syncCalendar();

          this.toast(
            'Resource schedule deleted'
          );

        },

        error: (err) => {

          console.error(err);

          alert(
            'Failed to delete resource schedule'
          );
        }
      });

    this.closeSlotPopup();
  }

  deleteFullSchedule() {

    const confirmed =
      confirm(
        'Delete full schedule?'
      );

    if (!confirmed) return;

    const schedulerId =
      this.selectedEventData
        .schedulerId;

    this.schedulerService
      .deleteScheduler(
        schedulerId
      )
      .subscribe({

        next: () => {

          // remove locally
          this.schedulers =
            this.schedulers.filter(
              (s: any) =>

                (s.id || s._id)
                !== schedulerId
            );

          this.syncCalendar();

          this.toast(
            'Schedule deleted'
          );

          this.closeSlotPopup();
        },

        error: (err) => {

          console.error(err);

          alert(
            'Failed to delete schedule'
          );
        }
      });
  }

  openEditByDoctor(resourceId: string, schedulerId: string) {

    const scheduler = this.schedulers.find(s => s._id === schedulerId);

    if (!scheduler) return;

    // load data into form
    this.title = scheduler.title;
    this.description = scheduler.description;
    this.selectedResources = this.users.filter(u =>
      scheduler.resourceSchedules.some((r: any) => r.resourceId === u.id)
    );

    this.daySlots = scheduler.daySlots.map((d: any) => ({

      date: d.date,

      displayDay:
        new Date(d.date)
          .toLocaleDateString(
            'en-US',
            { weekday: 'long' }
          ),

      unavailable: d.unavailable,

      slots: d.slots.map((s: any) => ({
        slotId: s.slotId || crypto.randomUUID(),
        start: s.start,
        end: s.end,
        type: s.type || 'GENERAL',
        booked: s.booked || false,
        maxBookings: s.maxBookings || 1
      }))
    }));

    // Mark as editing an existing scheduler so the save flow uses UPDATE
    this.isNewEvent = false;
    this.isFullScheduleEdit = true;
    this.selectedScheduler = scheduler;

    // copy scheduler-level metadata into the form so update preserves user's choices
    this.repeatOption =
      scheduler.repeatType === 0 ? 'none' : scheduler.repeatType === 1 ? 'weekly' : 'custom';
    this.repeatWeeks = scheduler.repeatWeeks || 1;
    this.customFromDate = scheduler.customFromDate || '';
    this.customToDate = scheduler.customToDate || '';
    this.fullDayStart = scheduler.fullDayStart || '';
    this.fullDayEnd = scheduler.fullDayEnd || '';
    this.maxBookingsPerDay = scheduler.maxBookingsPerDay || 1;
    this.status = scheduler.status || 'ACTIVE';
    this.timezone = scheduler.timezone || 'Asia/Kolkata';

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
  multiDeleteMode = false;

  slotActionPopup = false;
  selectedEventData: any = null;

  selectedSlots: {
    schedulerId: string;
    resourceId: string;
    slotId: string;
  }[] = [];

  private toastTimer: any;
  private autoGenTimer: any;

  /* ---------------- LIFECYCLE ---------------- */
  ngOnInit() {
    const authUser = this.authService.getCurrentUser();
    if (authUser) {
      // Accept several possible id fields the auth user may contain
      this.userId = authUser.userId || authUser.mongoId || (authUser as any)._id || (authUser as any).id || '';
      console.debug('Scheduler.ngOnInit: authUser=', authUser, 'resolved userId=', this.userId);
    }
    this.loadDoctors();
    this.loadFromCache();
    this.loadFromBackend();
  }

  // Normalize photo strings: accept either full data URLs or raw base64 payloads
  private normalizePhoto(photo: string | null | undefined): string | null {
    if (!photo) return null;
    const trimmed = photo.trim();
    if (trimmed.startsWith('data:')) return trimmed;
    // If it looks like JSON object accidentally stringified, try to parse
    try {
      if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return this.normalizePhoto(parsed);
      }
    } catch (e) {
      // ignore
    }
    // Default: assume raw base64 image (png)
    return 'data:image/png;base64,' + trimmed;
  }

  // Extract possible id strings from a createdBy value that may be string, object, or nested
  private extractIdsFromCreatedBy(createdByRaw: any): string[] {
    if (createdByRaw == null) return [];
    // Handle arrays
    if (Array.isArray(createdByRaw)) {
      return createdByRaw.flatMap(item => this.extractIdsFromCreatedBy(item));
    }
    // Strings — maybe JSON-stringified or plain id
    if (typeof createdByRaw === 'string') {
      const s = createdByRaw.trim();
      if (!s) return [];
      // If it looks like JSON, try parse
      if ((s.startsWith('{') || s.startsWith('['))) {
        try {
          const parsed = JSON.parse(s);
          return this.extractIdsFromCreatedBy(parsed);
        } catch (e) {
          // fall through
        }
      }
      return [s];
    }
    // Objects — inspect common id fields and recurse
    if (typeof createdByRaw === 'object') {
      const ids: string[] = [];
      const candidates = ['id', '_id', 'userId', 'mongoId', 'uid', 'name', 'username'];
      for (const k of candidates) {
        const v = (createdByRaw as any)[k];
        if (v != null) ids.push(String(v));
      }
      // Also inspect all string-valued properties and nested objects
      for (const v of Object.values(createdByRaw)) {
        if (typeof v === 'string' && v.trim()) ids.push(v.trim());
        if (typeof v === 'object' && v != null) ids.push(...this.extractIdsFromCreatedBy(v));
      }
      // Deduplicate and return
      return Array.from(new Set(ids)).filter(Boolean);
    }
    // Fallback: convert to string
    try {
      return [String(createdByRaw)];
    } catch (e) {
      return [];
    }
  }

  // Resolve createdBy candidate ids from a full user object by inspecting many possible fields
  private resolveCreatedByCandidates(u: any): string[] {
    if (!u) return [];
    const candidates: string[] = [];

    // 1) direct createdBy fields
    candidates.push(...this.extractIdsFromCreatedBy(u.payload?.createdBy ?? u.createdBy ?? u.createdById ?? u.created_by ?? u._createdBy));

    // 2) common clinic/owner/tenant fields that may represent the clinic id
    candidates.push(...this.extractIdsFromCreatedBy(u.payload?.clinicId ?? u.clinicId ?? u.ownerId ?? u.organizationId ?? u.tenantId ?? u.orgId));

    // 3) nested user objects that may carry id fields
    candidates.push(...this.extractIdsFromCreatedBy(u.createdByUser ?? u.createdByObj ?? u.owner ?? u.meta ?? u.metadata ?? u.payload?.meta));

    // 4) sometimes the creator is stored in a nested payload as an object or stringified JSON
    if (u.payload && typeof u.payload === 'object') {
      for (const v of Object.values(u.payload)) {
        if (v == null) continue;
        if (typeof v === 'string' && v.trim()) candidates.push(v.trim());
        if (typeof v === 'object') candidates.push(...this.extractIdsFromCreatedBy(v));
      }
    }

    // 5) include any top-level id-like fields to help matching (some backends store clinic id in weird fields)
    candidates.push(String(u.id || u._id || u.userId || u.mongoId || u.uid || ''));

    // normalize, dedupe and remove empties
    return Array.from(new Set(candidates.map(s => (s || '').toString().trim()).filter(Boolean)));
  }

  loadDoctors() {
    // Use the admin-scoped endpoint to get users created by the logged-in admin
    this.userService.getUsersByAdmin(0, 100, '').subscribe((res: any) => {
      const allUsers: any[] = res?.content ?? [];

      // current user id (set in ngOnInit)
      const currentUserId = this.userId;

      // Debug: inspect a sample of returned users to understand createdBy values
      try {
        console.debug('loadDoctors: sample allUsers:', allUsers.slice(0, 10).map(u => ({
          id: u.id || u._id || null,
          name: u.payload?.name || u.payload?.fullname || u.name || null,
          createdBy: u.payload?.createdBy ?? u.createdBy ?? null
        })));

        // Also log the raw first user and payload keys to verify presence of `photo`
        if (allUsers.length > 0) {
          try { console.debug('loadDoctors: raw first user:', JSON.parse(JSON.stringify(allUsers[0]))); } catch (e) { console.debug('loadDoctors: raw first user (non-serializable)', allUsers[0]); }
          try { console.debug('loadDoctors: payload keys for all users:', allUsers.map(u => Object.keys(u.payload || {}))); } catch (e) { }
        }
      } catch (e) {
        // ignore
      }

      // The backend `/users/by-admin` endpoint already scopes users to the logged-in admin.
      // Treat returned users as clinic-specific — just pick Doctor role entries.
      const clinicDoctors = allUsers
        .filter(u => ((u.payload?.role ?? u.role ?? '').toString().toLowerCase() === 'doctor'))
        .map(u => ({
          id: u.id || u._id || '',
          name: u.payload?.name || u.payload?.fullname || u.name || 'Unknown',
          role: (u.payload?.role ?? u.role ?? '').toString(),
          photo: this.normalizePhoto(u.payload?.photo || u.photo || null),
          avatarUrl: this.normalizePhoto(u.payload?.photo || u.photo || null),
          raw: u
        }));

      // Debug: show mapped photo/avatarUrl for clinic doctors
      try {
        console.debug('loadDoctors: mapped clinicDoctors sample:', clinicDoctors.slice(0, 10).map(c => ({ id: c.id, name: c.name, photo: c.photo, avatarUrl: c.avatarUrl })));
      } catch (e) { }

      // If no clinic-specific doctors found, prepare fallback list of any Doctor records
      const fallbackDoctors = allUsers
        .filter(u => ((u.payload?.role ?? u.role ?? '').toString().toLowerCase() === 'doctor'))
        .map(u => ({
          id: u.id || u._id || '',
          name: u.payload?.name || u.payload?.fullname || u.name || 'Unknown',
          role: (u.payload?.role ?? u.role ?? '').toString(),
          photo: this.normalizePhoto(u.payload?.photo || u.photo || null),
          avatarUrl: this.normalizePhoto(u.payload?.photo || u.photo || null),
          raw: u
        }));
      try {
        console.debug('loadDoctors: mapped fallbackDoctors sample:', fallbackDoctors.slice(0, 10).map(c => ({ id: c.id, name: c.name, photo: c.photo, avatarUrl: c.avatarUrl })));
      } catch (e) { }
      // Diagnostics: log why fallback was used
      console.debug('loadDoctors: currentUserId=', currentUserId, 'clinicDoctors=', clinicDoctors.length, 'fallbackDoctors=', fallbackDoctors.length);

      // store fallback for explicit user action
      this.fallbackUsers = fallbackDoctors;

      // By default only show clinic-specific doctors. Do NOT silently show all doctors.
      this.users = clinicDoctors;

      // If exactly one clinic doctor, pre-select and sync; otherwise clear selection
      if (this.users.length === 1) {
        this.selectedResources = [...this.users];
        this.syncCalendar();
      } else {
        this.selectedResources = [];
      }
    });
  }

  // Allow showing the global fallback list explicitly
  showFallbackDoctors() {
    this.users = this.fallbackUsers || [];
    this.showAllDoctorsFallback = true;
    this.selectedResources = [];
    this.syncCalendar();
  }

  hideFallbackDoctors() {
    this.showAllDoctorsFallback = false;
    this.loadDoctors();
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
    const schedulers$ = this.userId ? this.schedulerService.getSchedulersByCreator(this.userId) : this.schedulerService.getSchedulers();

    schedulers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: any[]) => {
        // defensive: dedupe schedulers by id in case backend returned duplicates
        const seenSched = new Set<string>();
        const uniq: any[] = [];
        for (const s of (res || [])) {
          const id = s.id || s._id;
          if (!id) {
            uniq.push(s);
            continue;
          }
          if (!seenSched.has(id)) {
            seenSched.add(id);
            uniq.push(s);
          }
        }
        this.schedulers = uniq;
        console.debug('[Scheduler] loadFromBackend — received', (res || []).length, 'schedulers;', this.schedulers.length, 'unique');
        try { console.debug('[Scheduler] loadFromBackend sample:', JSON.stringify((res || []).slice(0,2), null, 2)); } catch(e) {}
        setTimeout(() => {
          if (this.calendar) {
            this.syncCalendar();
          }
        }, 300);
      });
  }

  // mapSchedulersToCalendar() {

  //   if (!this.schedulers.length) return;

  //   this.initDaySlots();

  //   this.schedulers.forEach((scheduler: any) => {

  //     if (!scheduler.daySlots) return;

  //     scheduler.daySlots.forEach((day: any) => {

  //       const index = this.getDayIndex(day.dayName);

  //       if (index === -1) return;

  //       // merge unavailable
  //       if (day.unavailable) {
  //         this.daySlots[index].unavailable = true;
  //       }

  //       day.slots.forEach((s: any) => {

  //         const exists = this.daySlots[index].slots.find(
  //           slot => slot.start === s.start && slot.end === s.end
  //         );

  //         // ✅ avoid duplicates
  //         if (!exists) {
  //           this.daySlots[index].slots.push({
  //             slotId: crypto.randomUUID(),
  //             start: s.start,
  //             end: s.end,
  //             emergency: s.emergency
  //           });
  //         }

  //       });

  //     });

  //   });

  //   this.syncCalendar();

  // }

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
  // initDaySlots() {
  //   const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  //   this.daySlots = labels.map(l => ({
  //     label: l,
  //     unavailable: false,
  //     slots: []
  //   }));
  // }

  initDaySlots() {

    const currentViewDate =
      this.calendar?.getApi()?.getDate?.() || new Date();

    const weekStart = new Date(currentViewDate);

    weekStart.setDate(
      currentViewDate.getDate() -
      currentViewDate.getDay()
    );

    this.daySlots = [];

    for (let i = 0; i < 7; i++) {

      const current = new Date(weekStart);

      current.setDate(
        weekStart.getDate() + i
      );

      const date = this.formatYMD(current);

      const displayDay =
        current.toLocaleDateString('en-US', {
          weekday: 'long'
        });

      this.daySlots.push({
          date,
          displayDay,
          unavailable: false,
          slots: [],
          expanded: true
      });
    }
  }

    toggleDayExpand(i: number) {
      if (!this.daySlots[i]) return;
      this.daySlots[i].expanded = !this.daySlots[i].expanded;
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

  // Format a Date to local YYYY-MM-DD (avoids UTC shift from toISOString)
  private formatYMD(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private makeSlot(s: string, e: string): Slot {
    return { slotId: crypto.randomUUID(), start: s, end: e, type: 'GENERAL', booked: false, maxBookings: 1 };
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
        // Respect `maxBookingsPerDay` if provided: stop when we've reached count
        if (this.maxBookingsPerDay && slots.length >= this.maxBookingsPerDay) break;
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
  getCombinedSlots(day: any): Slot[] {
    return day.slots || [];
  }

  // isEmergency(_: any, s: Slot): boolean {
  //   return s.emergency;
  // }

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
      this.daySlots[di].slots.filter(x => x.slotId !== s.slotId);

    // ✅ FORCE CLEAN STATE
    this.daySlots[di].slots = [...this.daySlots[di].slots];

    this.syncCalendar();
  }

  deleteSingleSlot(
    schedulerId: string,
    resourceId: string,
    slotId: string,
    date?: string
  ) {

    this.schedulerService
      .deleteSlot(
        schedulerId,
        resourceId,
        slotId,
        date
      )
      .subscribe({

        next: () => {

          this.schedulers.forEach((scheduler: any) => {
            const sid = scheduler.id || scheduler._id;
            if (sid !== schedulerId) return;

            // Remove from resource-specific daySlots if present
            if (Array.isArray(scheduler.resourceSchedules)) {
              scheduler.resourceSchedules.forEach((rs: any) => {
                if (!rs || rs.resourceId !== resourceId) return;
                if (!Array.isArray(rs.daySlots)) return;
                rs.daySlots.forEach((d: any) => {
                  if (!d) return;
                  d.slots = (d.slots || []).filter((s: any) => s.slotId !== slotId);
                });
              });
            }

            // Also remove from scheduler-level daySlots (legacy shape)
            if (Array.isArray(scheduler.daySlots)) {
              scheduler.daySlots.forEach((d: any) => {
                if (!d) return;
                d.slots = (d.slots || []).filter((s: any) => s.slotId !== slotId);
              });
            }
          });

          this.syncCalendar();

          this.toast('Slot deleted');
        },

        error: (err) => {
          console.error(err);

          alert(
            'Failed to delete slot'
          );
        }
      });
  }

  deleteSelectedSlots() {

    if (
      this.selectedSlots.length === 0
    ) {
      return;
    }

    const confirmed = confirm(

      `Delete ${this.selectedSlots.length} selected slots?`
    );

    if (!confirmed) return;

    this.schedulerService
      .deleteMultipleSlots(
        this.selectedSlots
      )
      .subscribe({

        next: () => {

          // LOCAL REMOVE
          this.selectedSlots.forEach(
            selected => {

              this.schedulers.forEach(
                (scheduler: any) => {

                  if (
                    (scheduler.id || scheduler._id)
                    !== selected.schedulerId
                  ) {
                    return;
                  }

                  scheduler.resourceSchedules
                    ?.forEach((resource: any) => {

                      if (
                        resource.resourceId
                        !== selected.resourceId
                      ) {
                        return;
                      }

                      resource.daySlots
                        ?.forEach((day: any) => {

                          day.slots =
                            day.slots.filter(
                              (slot: any) =>

                                slot.slotId
                                !== selected.slotId
                            );
                        });
                    });
                });
            });

          this.selectedSlots = [];

          this.multiDeleteMode = false;

          this.syncCalendar();

          this.toast(
            'Selected slots deleted'
          );
        },

        error: (err) => {

          console.error(err);

          alert(
            'Failed to delete selected slots'
          );
        }
      });
  }

  toggleMultiDeleteMode() {

    this.multiDeleteMode =
      !this.multiDeleteMode;

    // reset selection
    if (!this.multiDeleteMode) {

      this.selectedSlots = [];

      this.syncCalendar();
    }
  }

  copySlotsToAllDays(srcIndex: number) {
    const src = this.daySlots[srcIndex];
    this.daySlots.forEach((d, i) => {
      if (i !== srcIndex && !d.unavailable) {
        d.slots = src.slots.map(s => ({
          ...s,
          slotId: crypto.randomUUID()
        }));
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

  onMaxBookingsChange(_: number) {
    // When max bookings per day changes in the editor, regenerate slots
    // to reflect the new cap so updates include the desired slot count.
    this.scheduleAutoGenerate();
  }

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

  // isDuplicateSchedule(newPayload: any): boolean {

  //   for (let existing of this.schedulers) {

  //     // ✅ IGNORE SAME SCHEDULER (IMPORTANT FIX)
  //     if (this.editingScheduleIndex !== null &&
  //       existing._id === this.schedulers[this.editingScheduleIndex]?._id) {
  //       continue;
  //     }

  //     const sameDoctor = existing.resourceSchedules.some((d: any) =>
  //       newPayload.resourceSchedules.includes(d.resourceId)
  //     );

  //     if (!sameDoctor) continue;

  //     for (let newDay of newPayload.daySlots) {

  //       const existingDay = existing.daySlots.find(
  //         (d: any) => d.date === newDay.date
  //       );

  //       if (!existingDay) continue;

  //       for (let newSlot of newDay.slots) {

  //         for (let oldSlot of existingDay.slots) {

  //           if (this.isOverlap(newSlot, oldSlot)) {

  //             const message =
  //               `❌ Overlapping slot detected\n\n` +
  //               `📅 Date: ${newDay.date}\n` +
  //               `⏰ Existing: ${oldSlot.start} - ${oldSlot.end}\n` +
  //               `⏰ New: ${newSlot.start} - ${newSlot.end}`;

  //             console.warn(message);

  //             alert(message);   // ✅ reliable fallback

  //             return true;
  //           }

  //         }

  //       }

  //     }

  //   }

  //   return false;
  // }

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

    if (this.selectedResources.length === 0) {
      alert("Please select at least one user");
      return;
    }

    let finalResourceSchedules: any[] = [];
    
    // helper: expand daySlots for weekly repeats
    const buildDaySlotsForPayload = (baseDaySlots: any[], repeatWeeksCount: number, preserveOriginalIds: boolean) => {
      const out: any[] = [];

      const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      // Anchor for resolving weekday-only templates: prefer the earliest explicit date
      // present in baseDaySlots so weekly expansion starts from the original week.
      // HOWEVER: avoid anchoring to a past date — ensure anchor is today or later
      // so we do not create daySlots in the past when expanding templates.
      let anchorDateForWeekday: Date | null = null;
      for (const d of baseDaySlots || []) {
        if (d && d.date) {
          const dt = new Date(d.date + 'T00:00:00');
          if (!isNaN(dt.getTime())) {
            if (!anchorDateForWeekday || dt.getTime() < anchorDateForWeekday.getTime()) anchorDateForWeekday = dt;
          }
        }
      }
      const todayAnchor = (() => { const t = new Date(); t.setHours(0,0,0,0); return t; })();
      const defaultAnchor = (anchorDateForWeekday && anchorDateForWeekday.getTime() >= todayAnchor.getTime()) ? anchorDateForWeekday : todayAnchor;

      const resolveBaseDate = (d: any) => {
        // Prefer explicit date if present (parse as local midnight)
        if (d && d.date) {
          return new Date(d.date + 'T00:00:00');
        }
        // Fallback: if a displayDay (weekday name) is provided, map into the week
        // containing the anchor date so templates expand consistently.
        if (d && d.displayDay) {
          const anchor = new Date(defaultAnchor);
          const target = weekdayNames.indexOf(d.displayDay);
          if (target === -1) return anchor;
          // compute start of anchor's week (Sunday)
          const startOfWeek = new Date(anchor);
          startOfWeek.setDate(anchor.getDate() - anchor.getDay());
          startOfWeek.setHours(0,0,0,0);
          const dt = new Date(startOfWeek);
          dt.setDate(startOfWeek.getDate() + target);
          return dt;
        }
        // As last resort, use the anchor or today at local midnight
        return new Date(defaultAnchor);
      };

      // When expanding for a single week, limit produced dates to the remainder
      // of the current week (from the resolved anchor/today) so we don't create
      // slots in past or in future weeks unintentionally.
      const weekEnd = (() => {
        const w = new Date(defaultAnchor);
        const endOffset = 6 - w.getDay();
        w.setDate(w.getDate() + endOffset);
        w.setHours(23,59,59,999);
        return w;
      })();

      for (let w = 0; w < Math.max(1, repeatWeeksCount); w++) {
        const dayOffset = w * 7;
        for (const d of baseDaySlots) {
          const base = resolveBaseDate(d);
          const dateObj = new Date(base);
          dateObj.setDate(dateObj.getDate() + dayOffset);

          // Skip dates before todayAnchor (avoid past days)
          if (dateObj.getTime() < todayAnchor.getTime()) continue;

          // If only a single week is requested, skip dates beyond the end of
          // the current week so expansion produces only the remaining days.
          if (Math.max(1, repeatWeeksCount) === 1 && dateObj.getTime() > weekEnd.getTime()) continue;

          const date = this.formatYMD(dateObj);
          out.push({
            date,
            unavailable: d.unavailable,
            slots: d.unavailable
                ? []
                : (() => {
                  let mapped = (d.slots || []).map((s: any) => ({
                    slotId: (preserveOriginalIds && w === 0 && s.slotId) ? s.slotId : crypto.randomUUID(),
                    start: s.start,
                    end: s.end,
                    type: s.type || 'GENERAL',
                    booked: s.booked || false,
                    maxBookings: s.maxBookings || 1
                  }));
                  if (this.maxBookingsPerDay && mapped.length > this.maxBookingsPerDay) mapped = mapped.slice(0, this.maxBookingsPerDay);
                  return mapped;
                })()
          });
        }
      }
      return out;
    };

    // helper: ensure we have a weekday-template for each weekday when user selected
    // weekly repeat but only supplied a single-date template (e.g., after switching
    // from 'none' -> 'weekly'). This will clone the provided template across
    // missing weekdays in the first week so weekly expansion produces full weeks.
    const ensureWeekdayTemplates = (baseDaySlots: any[]) => {
      if (!Array.isArray(baseDaySlots) || baseDaySlots.length === 0) return baseDaySlots;
      // If caller already supplied multiple day templates, respect them as-is
      if (baseDaySlots.length > 1) return baseDaySlots;

      const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

      // build map from weekday -> slot if present
      const byWeekday = new Map<string, any>();
      for (const d of baseDaySlots) {
        if (!d) continue;
        const wd = d.displayDay || (d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : null);
        if (wd && !byWeekday.has(wd)) byWeekday.set(wd, d);
      }

      // If we already have entries for multiple weekdays, return original
      if (byWeekday.size >= 2) return baseDaySlots;

      // Only expand when we have exactly one prototype template (no explicit dates)
      const proto = baseDaySlots[0];
      if (!proto) return baseDaySlots;

      // If the single provided template has an explicit date, keep it — caller
      // likely intended a single-day template rather than a weekly prototype.
      if (proto.date) return baseDaySlots;

      const expanded: any[] = [];
      for (const wd of weekdayNames) {
        expanded.push({
          date: null,
          displayDay: wd,
          unavailable: !!proto.unavailable,
          slots: proto.unavailable ? [] : (proto.slots || []).map((s: any) => ({ ...s }))
        });
      }

      return expanded;
    };

    // helper: convert provided daySlots (which may have explicit dates) into
    // prototype templates keyed by weekday (no `date` fields). Useful for update
    // flows where we want to send a reusable weekly template to the backend
    // instead of expanded concrete dates.
    const makePrototypeTemplates = (baseDaySlots: any[]) => {
      if (!Array.isArray(baseDaySlots)) return [];
      const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const byWeekday = new Map<string, any>();
      for (const d of baseDaySlots) {
        if (!d) continue;
        const weekday = d.displayDay || (d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : null);
        if (!weekday) continue;
        if (!byWeekday.has(weekday)) {
          byWeekday.set(weekday, {
            displayDay: weekday,
            unavailable: !!d.unavailable,
            slots: d.unavailable ? [] : (d.slots || []).map((s: any) => ({ ...s, slotId: s.slotId || crypto.randomUUID() }))
          });
        }
      }
      // ensure all weekdays present (clone prototype or empty)
      const proto = byWeekday.size > 0 ? Array.from(byWeekday.values())[0] : null;
      const out: any[] = [];
      for (const wd of weekdayNames) {
        if (byWeekday.has(wd)) out.push(byWeekday.get(wd));
        else if (proto) out.push({ displayDay: wd, unavailable: !!proto.unavailable, slots: proto.unavailable ? [] : (proto.slots || []).map((s:any)=>({ ...s, slotId: crypto.randomUUID() })) });
        else out.push({ displayDay: wd, unavailable: false, slots: [] });
      }
      return out;
    };
    
    // helper: expand baseDaySlots across a custom date range (inclusive)
    const buildDaySlotsForCustomRange = (baseDaySlots: any[], fromDateStr: string | null, toDateStr: string | null, preserveOriginalIds: boolean) => {
      if (!fromDateStr || !toDateStr) return buildDaySlotsForPayload(baseDaySlots, 1, preserveOriginalIds);
      const out: any[] = [];

      const parseDateString = (s: string) => {
        if (!s) return new Date(NaN);
        // Accept either YYYY-MM-DD or DD-MM-YYYY (or with /). Detect by position of year (4-digit)
        const clean = s.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean) || /^\d{4}\/\d{2}\/\d{2}$/.test(clean)) {
          return new Date(clean + 'T00:00:00');
        }
        const parts = clean.includes('/') ? clean.split('/') : clean.split('-');
        if (parts.length === 3) {
          // if first part is 4-digit, assume YYYY-MM-DD
          if (/^\d{4}$/.test(parts[0])) {
            return new Date(`${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}T00:00:00`);
          }
          // else assume DD-MM-YYYY
          const dd = parts[0].padStart(2,'0');
          const mm = parts[1].padStart(2,'0');
          const yyyy = parts[2];
          return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        }
        // fallback
        return new Date(clean);
      };

      const from = parseDateString(fromDateStr);
      const to = parseDateString(toDateStr);
      if (isNaN(from.getTime()) || isNaN(to.getTime()) || from.getTime() > to.getTime()) return [];

      // create a map by weekday name and by exact date for quick lookup
      const byDate = new Map<string, any>();
      const byWeekday = new Map<string, any>();
      const isTemplateOnly = (baseDaySlots || []).length > 0 && (baseDaySlots || []).every(d => !d || !d.date);
      // If caller supplied prototype slots (no exact dates), clone the first prototype to every date in range
      if (isTemplateOnly) {
        const proto = (baseDaySlots || [])[0];
        for (let cur = new Date(from); cur.getTime() <= to.getTime(); cur.setDate(cur.getDate() + 1)) {
          const dateStr = this.formatYMD(cur);
          const mapped = proto.unavailable ? [] : (proto.slots || []).map((s: any) => ({
            slotId: preserveOriginalIds && proto.date === dateStr && s.slotId ? s.slotId : crypto.randomUUID(),
            start: s.start,
            end: s.end,
            type: s.type || 'GENERAL',
            booked: s.booked || false,
            maxBookings: s.maxBookings || 1
          }));
          out.push({
            date: dateStr,
            unavailable: !!proto.unavailable,
            slots: (this.maxBookingsPerDay && mapped.length > this.maxBookingsPerDay) ? mapped.slice(0, this.maxBookingsPerDay) : mapped
          });
        }
        return out;
      }
      for (const d of baseDaySlots || []) {
        if (!d) continue;
        const keyDate = d.date ? this.formatYMD(parseDateString(d.date)) : null;
        if (keyDate) byDate.set(keyDate, d);
        const dayName = d.displayDay || (d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : null);
        if (dayName) byWeekday.set(dayName, d);
      }

        for (let cur = new Date(from); cur.getTime() <= to.getTime(); cur.setDate(cur.getDate() + 1)) {
        const dateStr = this.formatYMD(cur);
        const weekday = cur.toLocaleDateString('en-US', { weekday: 'long' });

        let src = byDate.get(dateStr) || byWeekday.get(weekday) || null;
        if (!src) {
          // if no source found, skip day
          continue;
        }

        out.push({
          date: dateStr,
          unavailable: !!src.unavailable,
          slots: (() => {
            let mapped = src.unavailable ? [] : (src.slots || []).map((s: any) => ({
              slotId: preserveOriginalIds && src.date === dateStr && s.slotId ? s.slotId : crypto.randomUUID(),
              start: s.start,
              end: s.end,
              type: s.type || 'GENERAL',
              booked: s.booked || false,
              maxBookings: s.maxBookings || 1
            }));
            if (this.maxBookingsPerDay && mapped.length > this.maxBookingsPerDay) mapped = mapped.slice(0, this.maxBookingsPerDay);
            return mapped;
          })()
        });
      }

      return out;
    };
    // =========================
    // UPDATE FLOW
    // =========================
    if (!this.isNewEvent) {

      // FULL SCHEDULE UPDATE
      if (this.isFullScheduleEdit) {

        // determine daySlots expansion based on repeat option
        let repeatWeeksCount = 1;
        let baseDaySlotsToUse = this.daySlots;

        if (this.repeatOption === 'weekly') {
          repeatWeeksCount = this.repeatWeeks || 1;
          baseDaySlotsToUse = ensureWeekdayTemplates(this.daySlots);
        } else if (this.repeatOption === 'custom') {
          // custom: expand across provided customFromDate -> customToDate range
          repeatWeeksCount = 1;
          baseDaySlotsToUse = this.daySlots;
        } else {
          // none: schedule should apply to a single day only — use today's date
          repeatWeeksCount = 1;
          const todayStr = this.formatYMD(new Date());
          if (this.daySlots && this.daySlots.length > 0) {
            const first = this.daySlots[0];
            const mappedSlots = (first.slots || []).map((s: any) => ({ ...s }));
            const clone = {
              date: todayStr,
              displayDay: new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
              unavailable: first.unavailable,
              slots: (this.maxBookingsPerDay && mappedSlots.length > this.maxBookingsPerDay) ? mappedSlots.slice(0, this.maxBookingsPerDay) : mappedSlots
            };
            baseDaySlotsToUse = [clone];
          } else {
            baseDaySlotsToUse = [];
          }
        }

        finalResourceSchedules = this.selectedResources.map(resource => ({
          resourceId: resource.id,
          resourceType: 'DOCTOR',
          // For UPDATE flows, prefer sending weekly prototype templates (no explicit dates)
          // rather than expanded concrete dates. This avoids backend merge bugs where
          // old explicit dates are retained. For custom ranges, continue to send
          // expanded explicit dates.
          daySlots: (this.repeatOption === 'custom')
            ? buildDaySlotsForCustomRange(baseDaySlotsToUse, this.customFromDate || null, this.customToDate || null, true)
            : buildDaySlotsForPayload(baseDaySlotsToUse, repeatWeeksCount, true)
        }));

      }

      // RESOURCE UPDATE FLOW
      else {

        const existingResourceSchedules =
          this.selectedScheduler
            ?.resourceSchedules || [];

        const updatedResourceIds =
          this.selectedResources.map(
            r => r.id
          );

        const untouchedResourceSchedules =
          existingResourceSchedules.filter(
            (r: any) =>
              !updatedResourceIds.includes(
                r.resourceId
              )
          );

        // determine daySlots expansion based on repeat option (resource update flow)
        let repeatWeeksCount = 1;
        let baseDaySlotsToUse = this.daySlots;

        if (this.repeatOption === 'weekly') {
          repeatWeeksCount = this.repeatWeeks || 1;
          baseDaySlotsToUse = ensureWeekdayTemplates(this.daySlots);
        } else if (this.repeatOption === 'custom') {
          repeatWeeksCount = 1;
          baseDaySlotsToUse = this.daySlots;
        } else {
          // none: single-day update should map to today
          repeatWeeksCount = 1;
          const todayStr = this.formatYMD(new Date());
          if (this.daySlots && this.daySlots.length > 0) {
            const first = this.daySlots[0];
            const mappedSlots = (first.slots || []).map((s: any) => ({ ...s }));
            const clone = {
              date: todayStr,
              displayDay: new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
              unavailable: first.unavailable,
              slots: (this.maxBookingsPerDay && mappedSlots.length > this.maxBookingsPerDay) ? mappedSlots.slice(0, this.maxBookingsPerDay) : mappedSlots
            };
            baseDaySlotsToUse = [clone];
          } else {
            baseDaySlotsToUse = [];
          }
        }

        const updatedResourceSchedules = this.selectedResources.map(resource => ({
          resourceId: resource.id,
          resourceType: 'DOCTOR',
          daySlots: this.repeatOption === 'custom'
            ? buildDaySlotsForCustomRange(baseDaySlotsToUse, this.customFromDate || null, this.customToDate || null, true)
            : buildDaySlotsForPayload(baseDaySlotsToUse, repeatWeeksCount, true)
        }));

        finalResourceSchedules = [
          ...untouchedResourceSchedules,
          ...updatedResourceSchedules
        ];
      }

    }

    // =========================
    // CREATE FLOW
    // =========================
    else {

      // CREATE FLOW: determine expansion based on repeat option
      let repeatWeeksCount = 1;
      let baseDaySlotsToUse = this.daySlots;

      if (this.repeatOption === 'weekly') {
        repeatWeeksCount = this.repeatWeeks || 1;
        baseDaySlotsToUse = ensureWeekdayTemplates(this.daySlots);
      } else if (this.repeatOption === 'custom') {
        repeatWeeksCount = 1;
        baseDaySlotsToUse = this.daySlots;
      } else {
        // none: create only for today
        repeatWeeksCount = 1;
        const todayStr = this.formatYMD(new Date());
        if (this.daySlots && this.daySlots.length > 0) {
          const first = this.daySlots[0];
          const mappedSlots = (first.slots || []).map((s: any) => ({ ...s }));
          const clone = {
            date: todayStr,
            displayDay: new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
            unavailable: first.unavailable,
            slots: (this.maxBookingsPerDay && mappedSlots.length > this.maxBookingsPerDay) ? mappedSlots.slice(0, this.maxBookingsPerDay) : mappedSlots
          };
          baseDaySlotsToUse = [clone];
        } else {
          baseDaySlotsToUse = [];
        }
      }

      finalResourceSchedules = this.selectedResources.map(resource => ({
        resourceId: resource.id,
        resourceType: 'DOCTOR',
        daySlots: this.repeatOption === 'custom'
          ? buildDaySlotsForCustomRange(baseDaySlotsToUse, this.customFromDate || null, this.customToDate || null, false)
          : buildDaySlotsForPayload(baseDaySlotsToUse, repeatWeeksCount, false)
      }));
    }

    // =========================
    // PAYLOAD
    // =========================
    const payload = {

      title: this.title,

      appointmentDuration:
        this.selectedDuration,

      repeatType:
        this.repeatOption === 'none'
          ? 0
          : this.repeatOption === 'weekly'
            ? 1
            : 2,

      // Mutually-exclusive repeat metadata: only send fields relevant to the selected repeat option.
      repeatWeeks: this.repeatOption === 'weekly' ? (this.repeatWeeks || 1) : null,
      customFromDate: this.repeatOption === 'custom' ? (this.customFromDate || null) : null,
      customToDate: this.repeatOption === 'custom' ? (this.customToDate || null) : null,

      fullDayStart:
        this.fullDayStart,

      fullDayEnd:
        this.fullDayEnd,

      maxBookingsPerDay:
        this.maxBookingsPerDay,

      resourceSchedules:
        finalResourceSchedules,

      description:
        this.description,

      status:
        this.status,

      timezone:
        this.timezone,

      createdBy:
        this.userId || '',

      updatedBy:
        this.userId || ''
    };

    // =========================
    // API CALL
    // =========================
    // Remove fields that are not applicable for the selected repeatType so the
    // backend doesn't accidentally merge leftover values from a prior configuration.
    if (payload.repeatType === 1) { // weekly
      delete (payload as any).customFromDate;
      delete (payload as any).customToDate;
    } else if (payload.repeatType === 2) { // custom
      delete (payload as any).repeatWeeks;
    } else { // none
      delete (payload as any).repeatWeeks;
      delete (payload as any).customFromDate;
      delete (payload as any).customToDate;
    }

    // debug: show final payload that will be sent to backend
    try { console.debug('[Scheduler] saveScheduler payload (cleaned):', JSON.stringify(payload, null, 2)); } catch (e) {}

    // Extra debug summary: list resourceSchedules and count of daySlots per resource
    try {
      const summary = (payload.resourceSchedules || []).map((r: any) => ({ resourceId: r.resourceId, daySlotsCount: (r.daySlots || []).length, sampleDates: (r.daySlots || []).slice(0,5).map((d:any)=>d.date) }));
      console.log('[Scheduler] saveScheduler resourceSchedules summary:', JSON.stringify(summary, null, 2));
      // Expose payload for quick inspection in browser console
      try { (window as any).__lastSchedulerPayload = payload; console.log('Saved payload available at window.__lastSchedulerPayload'); } catch (e) {}
    } catch (e) {}

    Promise.resolve().then(() => {

      const request =
        this.isNewEvent

          ? this.schedulerService
            .saveScheduler(payload)

          : this.schedulerService
            .updateScheduler(
              this.selectedScheduler.id
              || this.selectedScheduler._id,
              payload
            );

      request.subscribe({

        next: (res: any) => {

          console.debug('[Scheduler] saveScheduler response:', res);

          this.toast(
            this.isNewEvent
              ? 'Schedule saved successfully'
              : 'Schedule updated successfully'
          );

          this.drawerOpen = false;

          // Fetch canonical scheduler list from backend and let loadFromBackend -> syncCalendar
          // ensure calendar is populated with the server-side representation (avoid optimistic gaps)
          this.loadFromBackend();

          this.resetForm();
        },

        error: (err) => {

          console.error(err);

          alert(
            this.isNewEvent
              ? 'Failed to save schedule'
              : 'Failed to update schedule'
          );
        }
      });

    });
  }

  resetForm() {
    this.isFullScheduleEdit = false;
    this.title = '';
    this.description = '';
    this.selectedResources = [];
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
          alert(`Overlapping slot in ${d.displayDay}`);
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

    console.debug('[Scheduler] syncCalendar start — schedulers:', this.schedulers?.length, 'selectedResources:', this.selectedResources?.length);
    try { console.debug('[Scheduler] syncCalendar schedulers sample:', JSON.stringify((this.schedulers||[]).slice(0,2), null, 2)); } catch(e) {}

    if (!this.calendar) return;

    const api = this.calendar.getApi();

    api.removeAllEvents();

    this.calendarEvents = [];

    const selectedIds =
      this.selectedResources.map(
        u => u.id
      );

    const seenEventIds = new Set<string>();

    this.schedulers.forEach(
      (scheduler: any) => {

        // scheduler must have resourceSchedules
        if (!scheduler.resourceSchedules)
          return;

        // resource filter
        if (selectedIds.length > 0) {

          const match =
            scheduler.resourceSchedules.some(
              (r: any) =>
                selectedIds.includes(
                  r.resourceId
                )
            );

          if (!match) return;
        }

        // loop resource schedules
        scheduler.resourceSchedules.forEach(
          (resourceSchedule: any) => {

            const resourceId =
              resourceSchedule.resourceId;

            // selected resource filter
            if (
              this.selectedResources.length > 0
            ) {

              const selectedIds =
                this.selectedResources.map(
                  u => u.id
                );

              if (
                !selectedIds.includes(resourceId)
              ) return;
            }

            // loop day slots

            // Determine repeat limits from scheduler metadata so we can
            // trim backend-expanded daySlots when user requested fewer weeks.
            const schedRepeatType = scheduler.repeatType ?? 0; // 0=none,1=weekly,2=custom
            const schedRepeatWeeks = scheduler.repeatWeeks || 1;

            // Prefer resource-specific daySlots, but fall back to scheduler.daySlots
            const originalDaySlots = resourceSchedule.daySlots || [];
            let daySlotsSource = originalDaySlots;

            // Deduplicate exact-date entries (keep first occurrence). This addresses
            // backend responses that accidentally include the same date multiple times.
            if (daySlotsSource && daySlotsSource.length > 1) {
              const seenDates = new Set<string>();
              const filtered: any[] = [];
              for (const d of daySlotsSource) {
                if (!d) {
                  filtered.push(d);
                  continue;
                }
                // Only dedupe entries that have an explicit date; prototype entries
                // (displayDay without date) should be preserved.
                if (!d.date) {
                  filtered.push(d);
                  continue;
                }
                if (seenDates.has(d.date)) {
                  continue;
                }
                seenDates.add(d.date);
                filtered.push(d);
              }
              if (filtered.length !== daySlotsSource.length) {
                try {
                  console.debug('[Scheduler] deduplicated daySlotsSource by date', { resourceId, before: daySlotsSource.length, after: filtered.length });
                } catch (e) {}
                daySlotsSource = filtered;
              }
            }

            if ((!originalDaySlots || originalDaySlots.length === 0) && Array.isArray(scheduler.daySlots) && scheduler.daySlots.length > 0) {
              // Some backend versions store daySlots at the scheduler level rather than per-resource.
              // Use scheduler.daySlots as a rendering fallback so events are visible.
              daySlotsSource = scheduler.daySlots.map((d: any) => ({ ...d }));
              console.debug('[Scheduler] falling back to scheduler.daySlots for resourceSchedule render', { schedulerId: scheduler.id || scheduler._id, resourceId, fallbackCount: daySlotsSource.length });
            }

            // earliest date in this resourceSchedule (defensive)
            const allDates = (daySlotsSource || []).map((d: any) => new Date(d.date + 'T00:00:00'));
            const earliestDate = allDates.length ? new Date(Math.min(...allDates.map((d: Date) => d.getTime()))) : null;

            let allowedEndDate: Date | null = null;
            if (earliestDate && schedRepeatType === 1 && schedRepeatWeeks > 0) {
              allowedEndDate = new Date(earliestDate);
              allowedEndDate.setDate(allowedEndDate.getDate() + (schedRepeatWeeks * 7) - 1);
            }

            if (!daySlotsSource || daySlotsSource.length === 0) {
              console.debug('[Scheduler] resourceSchedule has no daySlots for', { schedulerId: scheduler.id || scheduler._id, resourceId });
              return;
            }

            console.debug('[Scheduler] resourceSchedule sample dates', (daySlotsSource||[]).slice(0,3).map((d: any)=>d.date));
            try {
              console.debug('[Scheduler] syncCalendar context', {
                schedulerId: scheduler.id || scheduler._id,
                resourceId,
                selectedResourceIds: this.selectedResources.map((u:any)=>u.id),
                daySlotsSourceDates: (daySlotsSource||[]).map((d:any)=>d.date),
                schedRepeatType,
                schedRepeatWeeks,
                earliestDate: earliestDate ? this.formatYMD(earliestDate) : null,
                allowedEndDate: allowedEndDate ? this.formatYMD(allowedEndDate) : null
              });
            } catch(e) {}
            console.debug('[Scheduler] scheduler repeat/custom range', { repeatType: schedRepeatType, customFrom: scheduler.customFromDate, customTo: scheduler.customToDate });

            // Build the iterable daySlots for rendering. Handle custom-range expansion
            // and weekly-template expansion when the backend returned prototype/weekday-only entries.
            let daySlotsToIterate = daySlotsSource || [];

            // If scheduler is weekly (repeatType === 1) expand templates or explicit first-week
            // entries across `schedRepeatWeeks` so the calendar shows repeated weeks.
            if (schedRepeatType === 1 && schedRepeatWeeks > 0) {
              const hasExplicitDates = (daySlotsSource || []).some((d: any) => !!d && !!d.date);

              // Case A: backend returned prototype-only entries (no explicit dates)
              if (!hasExplicitDates) {
                const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                // find an anchor date if any explicit date exists (defensive), otherwise today local midnight
                let anchorDateForWeekday: Date | null = null;
                for (const d of daySlotsSource || []) {
                  if (d && d.date) {
                    const dt = new Date(d.date + 'T00:00:00');
                    if (!isNaN(dt.getTime())) {
                      if (!anchorDateForWeekday || dt.getTime() < anchorDateForWeekday.getTime()) anchorDateForWeekday = dt;
                    }
                  }
                }
                const defaultAnchor = anchorDateForWeekday || (() => { const t = new Date(); t.setHours(0,0,0,0); return t; })();

                const resolveBaseDate = (d: any) => {
                  if (d && d.date) return new Date(d.date + 'T00:00:00');
                  if (d && d.displayDay) {
                    const anchor = new Date(defaultAnchor);
                    const target = weekdayNames.indexOf(d.displayDay);
                    if (target === -1) return anchor;
                    const startOfWeek = new Date(anchor);
                    startOfWeek.setDate(anchor.getDate() - anchor.getDay());
                    startOfWeek.setHours(0,0,0,0);
                    const dt = new Date(startOfWeek);
                    dt.setDate(startOfWeek.getDate() + target);
                    return dt;
                  }
                  return new Date(defaultAnchor);
                };

                const expanded: any[] = [];
                for (let w = 0; w < Math.max(1, schedRepeatWeeks); w++) {
                  const dayOffset = w * 7;
                  for (const d of (daySlotsSource || [])) {
                    const base = resolveBaseDate(d);
                    const dateObj = new Date(base);
                    dateObj.setDate(dateObj.getDate() + dayOffset);
                    const date = this.formatYMD(dateObj);
                    expanded.push({
                      date,
                      unavailable: d?.unavailable,
                      slots: d?.unavailable ? [] : (d.slots || []).map((s: any) => ({ ...s }))
                    });
                  }
                }
                daySlotsToIterate = expanded;
                console.debug('[Scheduler] weekly-expanded daySlots count', expanded.length, 'repeatWeeks', schedRepeatWeeks, 'hasExplicitDates?', hasExplicitDates, 'originalProtoCount', (daySlotsSource||[]).length);
              }

              // Case B: backend provided explicit dates (often only the first week) — if the
              // provided dates cover fewer weeks than requested, replicate their weekday
              // templates across remaining weeks so events appear for all repeat weeks.
              else {
                try {
                  // build map of weekday -> prototype slot (use first occurrence)
                  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                  const byWeekday = new Map<string, any>();
                  for (const d of (daySlotsSource || [])) {
                    if (!d) continue;
                    const weekday = d.displayDay || (d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : null);
                    if (weekday && !byWeekday.has(weekday)) byWeekday.set(weekday, d);
                  }

                  // determine base week start (Sunday) using earliestDate
                  if (earliestDate) {
                    const baseWeekStart = new Date(earliestDate);
                    baseWeekStart.setDate(earliestDate.getDate() - earliestDate.getDay());
                    baseWeekStart.setHours(0,0,0,0);

                    // If backend provided fewer distinct weeks than requested, replicate the
                    // full set of weekday templates across the requested number of weeks.
                    const expanded: any[] = [];
                    for (let w = 0; w < Math.max(1, schedRepeatWeeks); w++) {
                      for (let idx = 0; idx < weekdayNames.length; idx++) {
                        const weekday = weekdayNames[idx];
                        if (!byWeekday.has(weekday)) continue;
                        const src = byWeekday.get(weekday);
                        const dateObj = new Date(baseWeekStart);
                        dateObj.setDate(baseWeekStart.getDate() + idx + w * 7);
                        const date = this.formatYMD(dateObj);
                        expanded.push({
                          date,
                          unavailable: !!src.unavailable,
                          slots: src.unavailable ? [] : (src.slots || []).map((s: any) => ({ ...s }))
                        });
                      }
                    }

                    // Only replace if expansion produces more entries than provided (avoid shrinking)
                    if (expanded.length > (daySlotsSource || []).length) {
                      daySlotsToIterate = expanded;
                      console.debug('[Scheduler] weekly-expanded explicitDates -> expanded count', expanded.length, 'repeatWeeks', schedRepeatWeeks, 'originalCount', (daySlotsSource||[]).length);
                    }
                  }
                } catch (e) {
                  // fall back to provided daySlotsSource if anything goes wrong
                }
              }
            }

            // If scheduler is custom-range (repeatType === 2) and backend returned a template
            // (for example a single prototype date), expand the template across the
            // scheduler.customFromDate..customToDate range so events are visible.
            if ((schedRepeatType === 2) && scheduler.customFromDate && scheduler.customToDate) {
              const parseDate = (s: string) => new Date(s + 'T00:00:00');
              const from = parseDate(scheduler.customFromDate);
              const to = parseDate(scheduler.customToDate);
              if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from.getTime() <= to.getTime()) {
                const byDate = new Map<string, any>();
                const byWeekday = new Map<string, any>();
                for (const d of resourceSchedule.daySlots) {
                  if (!d) continue;
                  const keyDate = d.date ? this.formatYMD(new Date(d.date + 'T00:00:00')) : null;
                  if (keyDate) byDate.set(keyDate, d);
                  const dayName = d.displayDay || (d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : null);
                  if (dayName) byWeekday.set(dayName, d);
                }

                const expanded: any[] = [];
                for (let cur = new Date(from); cur.getTime() <= to.getTime(); cur.setDate(cur.getDate() + 1)) {
                  const dateStr = this.formatYMD(cur);
                  const weekday = cur.toLocaleDateString('en-US', { weekday: 'long' });
                    let src = null as any;
                    if (byDate.has(dateStr)) {
                      src = byDate.get(dateStr);
                    } else if (byWeekday.has(weekday)) {
                      src = byWeekday.get(weekday);
                    } else if ((resourceSchedule.daySlots || []).length > 0) {
                      // No exact date or weekday match — clone the first provided daySlots entry
                      // so every date in the custom range is populated (inclusive).
                      src = resourceSchedule.daySlots[0];
                    }
                    if (!src) continue;
                  expanded.push({
                    date: dateStr,
                    unavailable: !!src.unavailable,
                    slots: src.unavailable ? [] : (src.slots || []).map((s: any) => ({ ...s }))
                  });
                }
                daySlotsToIterate = expanded;
                console.debug('[Scheduler] expanded daySlots count', expanded.length, 'from', scheduler.customFromDate, 'to', scheduler.customToDate, 'originalCount', (resourceSchedule.daySlots||[]).length);
                try { console.debug('[Scheduler] expanded dates:', expanded.map(d => d.date)); } catch (e) {}
              }
            }

            try { console.debug('[Scheduler] daySlotsToIterate BEFORE iterate count', (daySlotsToIterate||[]).length, 'sampleDates', (daySlotsToIterate||[]).slice(0,6).map((d:any)=>d.date)); } catch(e) {}

            daySlotsToIterate.forEach(
              (day: any) => {
                // Skip any day entries that are before today — do not create events for past dates
                try {
                  const todayMid = new Date();
                  todayMid.setHours(0,0,0,0);
                  const dayDateObj = new Date((day.date || '') + 'T00:00:00');
                  if (!isNaN(dayDateObj.getTime()) && dayDateObj.getTime() < todayMid.getTime()) {
                    return;
                  }
                } catch (e) {
                  // ignore parse errors and continue
                }
                // if scheduler says 'none' (single-day), prefer today's date; if not present, fall back to earliest date
                if (schedRepeatType === 0) {
                  const todayStr = this.formatYMD(new Date());
                  if (day.date !== todayStr) {
                    if (earliestDate) {
                      const dDate = new Date(day.date + 'T00:00:00');
                      if (dDate.getTime() !== earliestDate.getTime()) return;
                    } else {
                      return;
                    }
                  }
                }
                // if scheduler is weekly, trim days beyond allowedEndDate
                if (allowedEndDate) {
                  const dDate = new Date(day.date + 'T00:00:00');
                  if (dDate.getTime() > allowedEndDate.getTime()) return;
                }

                if (day.unavailable)
                  return;

                const date =
                  new Date(
                    day.date + 'T00:00:00'
                  );

                // loop slots
                day.slots.forEach(
                  (slot: any) => {

                    const [sh, sm] =
                      slot.start
                        .split(':')
                        .map(Number);

                    const [eh, em] =
                      slot.end
                        .split(':')
                        .map(Number);

                    const startTime =
                      new Date(date);

                    startTime.setHours(
                      sh,
                      sm,
                      0,
                      0
                    );

                    const endTime =
                      new Date(date);

                    endTime.setHours(
                      eh,
                      em,
                      0,
                      0
                    );

                    // derive scheduler id value
                    const schedulerIdVal = scheduler.id || scheduler._id;

                    // use a composite key (scheduler + resource + local start time) to dedupe reliably
                    const startKey = `${this.formatYMD(startTime)}T${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`;
                    const compositeId = `${schedulerIdVal}_${resourceId}_${startKey}`;

                    // Debug event details to help trace timezone/date mismatches
                    try {
                      console.debug('[Scheduler] creating event', { schedulerId: schedulerIdVal, resourceId, dayDate: day.date, startKey, startLocal: startTime.toString(), slotStart: slot.start, slotEnd: slot.end });
                    } catch (e) {}

                    if (seenEventIds.has(compositeId)) return;
                    seenEventIds.add(compositeId);

                    const uniqueSlotId = `${resourceId}_${day.date}_${slot.slotId || crypto.randomUUID()}`;

                    this.calendarEvents.push({

                      id: uniqueSlotId,

                      // Visible title: only resource name (time shown in tooltip)
                      title: this.getResourceName(resourceId),

                      start: startTime,

                      end: endTime,

                      backgroundColor:
                        this.getResourceColor(
                          resourceId
                        ),

                      borderColor:
                        this.getResourceColor(
                          resourceId
                        ),

                      extendedProps: {

                        resourceId,

                        schedulerId:
                          schedulerIdVal,

                        slotId:
                          uniqueSlotId,

                        originalSlotId:
                          slot.slotId,

                        slot,

                        date: day.date
                      },

                      className:
                        slot.type === 'EMERGENCY'
                          ? 'fc-emergency'
                          : 'fc-general'
                    });

                  });

              });

          });

      });

    // Sort events by start time so earliest is first, then add as a single source
    this.calendarEvents.sort((a, b) => {
      const da = new Date(a.start as any).getTime();
      const db = new Date(b.start as any).getTime();
      return da - db;
    });

    // Add a single event source (avoid adding twice which causes duplicates)
      try {
      api.addEventSource(this.calendarEvents);
      api.render();
    } catch (e) {
      // graceful fallback: try adding events individually if addEventSource fails
      try {
        api.removeAllEvents();
        this.calendarEvents.forEach(ev => api.addEvent(ev as any));
        api.render();
      } catch (err) {
        console.error('[Scheduler] failed to add events', err);
      }
    }

    // debug: log event counts and earliest event for troubleshooting
    try {
      console.debug('[Scheduler] syncCalendar events:', this.calendarEvents.length,
        'earliest:', this.calendarEvents.length ? this.calendarEvents[0].start : null);

      // Auto-focus calendar to earliest event so newly-added schedules are visible
      if (this.calendarEvents.length > 0) {
      const earliest = new Date((this.calendarEvents[0].start as Date));

      // Prefer focusing to today when earliest event is in the past — keep view starting at today
      let focusDate = earliest;
      const todayMid = new Date();
      todayMid.setHours(0,0,0,0);
      if (focusDate.getTime() < todayMid.getTime()) focusDate = todayMid;
        try {
          const customFromDates = (this.schedulers||[])
            .filter((s: any) => s.repeatType === 2 && s.customFromDate)
            .map((s: any) => new Date(s.customFromDate + 'T00:00:00'))
            .filter((d: Date) => !isNaN(d.getTime()));

          if (customFromDates.length > 0) {
            const minCustom = new Date(Math.min(...customFromDates.map(d => d.getTime())));
            if (minCustom.getTime() < focusDate.getTime()) focusDate = minCustom;
          }
        } catch (e) { /* ignore parsing errors */ }

        // go to focusDate but keep view
        this.calendar.getApi().gotoDate(focusDate);
      }

    } catch (e) { }

    // Auto-scroll disabled — keep calendar static as configured
  }

  // Auto-scroll removed: keep function as a no-op so calls are safe if left elsewhere.
  private ensureScrollToFirstEventIfNeeded() {
    return;
  }

  getResourceName(id: string) {
    return this.users.find(u => u.id === id)?.name || id;
  }

  getResourceColor(id: string) {
    const palette = ['#3E7BFA', '#28a745', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];
    const idx = this.users.findIndex(u => u.id === id);
    return palette[idx >= 0 ? idx % palette.length : 0];
  }


  /* ---------------- DRAWER ---------------- */
  openDrawerForAdd() {
    this.isNewEvent = true;
    this.drawerOpen = true;
    this.captureSnapshot();
  }

  onAddButtonClicked() {
    // ensure calendar opens focused on today in week view
    this.changeView('timeGridWeek');
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
    const api = this.calendar.getApi();
    const today = new Date();

    // Map default buttons to custom views that start at today
    if (v === 'timeGridWeek') {
      api.changeView('customWeek');
      api.gotoDate(today);
    } else if (v === 'dayGridMonth') {
      // use standard month grid but focus on today
      api.changeView('dayGridMonth');
      api.gotoDate(today);
    } else {
      // other views (day, list) - navigate to today to keep focus
      api.changeView(v);
      api.gotoDate(today);
    }

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
  //     this.selectedResources.push(user);
  //   } else {
  //     this.selectedResources =
  //       this.selectedResources.filter(u => u.id !== user.id);
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

    if (this.customFromDate && this.customFromDate < this.todayString) {
      this.dateError = 'From Date cannot be less than today.';
      this.customFromDate = this.todayString;
    }
    if (this.customFromDate && this.customFromDate > this.maxToDateString) {
      this.dateError = 'From Date cannot be more than 10 days from today.';
      this.customFromDate = this.maxToDateString;
    }
    if (this.customToDate && this.customToDate < this.customFromDate) {
      this.dateError = 'To Date cannot be less than From Date.';
      this.customToDate = this.customFromDate;
    }
    if (this.customToDate && this.customToDate > this.maxToDateString) {
      this.dateError = 'To Date cannot be more than 10 days from today.';
      this.customToDate = this.maxToDateString;
    }
    this.syncCalendar();
    this.calendar.getApi().changeView('timeGridWeek');
    this.currentView = 'timeGridWeek';
    this.updateTitles();
    if (this.customToDate && this.customToDate < (this.customFromDate || this.todayString)) {
      this.dateError = 'To Date cannot be less than From Date.';
      this.customToDate = this.customFromDate || this.todayString;
    }
    if (this.customToDate && this.customToDate > this.maxToDateString) {
      this.dateError = 'To Date cannot be more than 10 days from today.';
      this.customToDate = this.maxToDateString;
    }
    // this.userDropdownOpen = !this.userDropdownOpen;
  }

  // ...existing code...

  isUserSelected(user: any): boolean {
    return this.selectedResources.some(u => u.id === user.id);
  }

  onUserCheckboxChange(event: any, user: any) {
    if (event.target.checked) {
      this.selectedResources.push(user);
    } else {
      this.selectedResources =
        this.selectedResources.filter(u => u.id !== user.id);
    }

    // ✅ IMPORTANT
    this.syncCalendar();
  }

  filteredResources(): any[] {
    const q = (this.userSearchText || '').trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u => (u.name || '').toLowerCase().includes(q));
  }

  isAllSelected(): boolean {
    const filtered = this.filteredResources();

    if (filtered.length === 0) return false;

    return filtered.every((user: any) =>
      this.selectedResources.some((u: any) => u.id === user.id)
    );
  }

  toggleSelectAll(event: any) {

    const filtered = this.filteredResources();

    if (event.target.checked) {
      filtered.forEach((user: any) => {
        if (!this.isUserSelected(user)) {
          this.selectedResources.push(user);
        }
      });
    } else {
      this.selectedResources = this.selectedResources.filter(
        u => !filtered.some((f: any) => f.id === u.id)
      );
    }

    // ✅ IMPORTANT
    this.syncCalendar();
  }

}
