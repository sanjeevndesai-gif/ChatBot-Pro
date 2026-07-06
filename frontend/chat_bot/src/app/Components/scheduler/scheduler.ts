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
      const minToDateString = minToDate.toISOString().split('T')[0];
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
    return fromDate.toISOString().split('T')[0];
  }
  todayString: string = new Date().toISOString().split('T')[0];
  maxToDateString: string = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
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
    // allow views to navigate forward — only prevent past dates
    validRange: {
      start: this.todayString
    },
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

    this.deleteSingleSlot(
      schedulerId,
      resourceId,
      originalSlotId
    );

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
    this.schedulerService.getSchedulers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: any[]) => {
        this.schedulers = res;
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

      const date =
        current.toISOString().split('T')[0];

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
    slotId: string
  ) {

    this.schedulerService
      .deleteSlot(
        schedulerId,
        resourceId,
        slotId
      )
      .subscribe({

        next: () => {

          this.schedulers.forEach(
            (scheduler: any) => {

              if (
                scheduler._id !== schedulerId
              ) return;

              scheduler.daySlots.forEach(
                (d: any) => {

                  d.slots =
                    d.slots.filter(
                      (s: any) =>
                        s.slotId !== slotId
                    );

                });

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
      for (let w = 0; w < Math.max(1, repeatWeeksCount); w++) {
        const dayOffset = w * 7;
        for (const d of baseDaySlots) {
          const dateObj = new Date(d.date);
          dateObj.setDate(dateObj.getDate() + dayOffset);
          const date = dateObj.toISOString().split('T')[0];
          out.push({
            date,
            unavailable: d.unavailable,
            slots: d.unavailable
              ? []
              : (d.slots || []).map((s: any) => ({
                slotId: (preserveOriginalIds && w === 0 && s.slotId) ? s.slotId : crypto.randomUUID(),
                start: s.start,
                end: s.end,
                type: s.type || 'GENERAL',
                booked: s.booked || false,
                maxBookings: s.maxBookings || 1
              }))
          });
        }
      }
      return out;
    };
    // =========================
    // UPDATE FLOW
    // =========================
    if (!this.isNewEvent) {

      // FULL SCHEDULE UPDATE
      if (this.isFullScheduleEdit) {

        const repeatWeeksCount = this.repeatOption === 'weekly' ? (this.repeatWeeks || 1) : 1;

        finalResourceSchedules = this.selectedResources.map(resource => ({
          resourceId: resource.id,
          resourceType: 'DOCTOR',
          daySlots: buildDaySlotsForPayload(this.daySlots, repeatWeeksCount, true)
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

        const repeatWeeksCount = this.repeatOption === 'weekly' ? (this.repeatWeeks || 1) : 1;

        const updatedResourceSchedules = this.selectedResources.map(resource => ({
          resourceId: resource.id,
          resourceType: 'DOCTOR',
          daySlots: buildDaySlotsForPayload(this.daySlots, repeatWeeksCount, true)
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

      const repeatWeeksCount = this.repeatOption === 'weekly' ? (this.repeatWeeks || 1) : 1;

      finalResourceSchedules = this.selectedResources.map(resource => ({
        resourceId: resource.id,
        resourceType: 'DOCTOR',
        daySlots: buildDaySlotsForPayload(this.daySlots, repeatWeeksCount, false)
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

      repeatWeeks:
        this.repeatWeeks || null,

      customFromDate:
        this.customFromDate || null,

      customToDate:
        this.customToDate || null,

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

          this.toast(
            this.isNewEvent
              ? 'Schedule saved successfully'
              : 'Schedule updated successfully'
          );

          this.drawerOpen = false;

          this.mergeScheduler(res);

          this.syncCalendar();

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

    if (!this.calendar) return;

    const api = this.calendar.getApi();

    api.removeAllEvents();

    this.calendarEvents = [];

    const selectedIds =
      this.selectedResources.map(
        u => u.id
      );

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
            resourceSchedule.daySlots.forEach(
              (day: any) => {

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

                    // IMPORTANT
                    // unique event id per resource
                    const uniqueSlotId =
                      `${resourceId}_${slot.slotId}`;

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
                          scheduler.id ||
                          scheduler._id,

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
