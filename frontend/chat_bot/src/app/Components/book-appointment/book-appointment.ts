import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { SchedulerService } from '../../services/scheduler.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface BookingInfo {
  fullName: string;
  phone: string;
  purpose?: string;
  appointmentId?: string;
}

interface Slot {
  time: string;
  status: 'open' | 'booked';
  bookingInfo?: BookingInfo;
  schedulerId?: string;
  resourceId?: string;
  slotId?: string;
}

interface DaySlots {
  date: Date;
  slots: Slot[];
}

interface MiniDate {
  day: number | null;
  date?: Date;
  isToday?: boolean;
  isSelected?: boolean;
}

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-appointment.html',
  styleUrls: ['./book-appointment.scss']
})
export class BookAppointment implements OnInit {

  constructor(
    private appointmentService: AppointmentService,
    private schedulerService: SchedulerService,
    private userService: UserService,
    private authService: AuthService,
    private http: HttpClient
  ) { }

  doctors: { id: string; name: string; specialization: string }[] = [];
  fallbackDoctors: { id: string; name: string; specialization: string }[] = [];
  selectedDoctor: string = '';

  currentWeekStart!: Date;
  weekDays: DaySlots[] = [];

  miniDays: MiniDate[] = [];
  miniMonthYear = '';

  showModal = false;
  selectedDay!: Date;
  selectedSlot!: Slot;

  // cancel flow state
  showCancelModal = false;
  cancelTargetSlot?: Slot;
  cancelTargetDate?: Date;

  submitted = false;

  patient = {
    fullName: '',
    countryCode: '+91',
    phone: '',
    purpose: ''
  };

  /** backend slots storage */
  scheduledSlots: Record<string, Slot[]> = {};

  ngOnInit() {

    const today = new Date();

    this.setWeekStart(today);
    this.buildMiniCalendar(today);

    this.loadDoctors();
  }

  /** LOAD DOCTORS FROM BACKEND USERS */
  loadDoctors() {
    // Use admin-scoped endpoint to get users created by logged-in admin (clinic-specific)
    this.userService.getUsersByAdmin(0, 100, '').subscribe((res: any) => {
      const allUsers: any[] = res?.content ?? [];

      const clinicDoctors = allUsers
        .filter(u => String(u.payload?.role ?? u.role ?? '').toLowerCase() === 'doctor')
        .map(u => ({
          id: u.id || u._id || '',
          name: u.payload?.name || u.payload?.fullname || u.name || 'Unknown',
          specialization: u.payload?.specialization || u.specialization || ''
        }));

      const fallback = allUsers
        .filter(u => String(u.payload?.role ?? u.role ?? '').toLowerCase() === 'doctor')
        .map(u => ({
          id: u.id || u._id || '',
          name: u.payload?.name || u.payload?.fullname || u.name || 'Unknown',
          specialization: u.payload?.specialization || u.specialization || ''
        }));

      this.fallbackDoctors = fallback;

      // Prefer showing only the logged-in user's doctor entry when available
      const authUser = this.authService.getCurrentUser();
      let currentUserId = '';
      if (authUser) {
        // Resolve several possible id fields defensively
        currentUserId = (authUser as any).userId ?? (authUser as any).mongoId ?? (authUser as any).id ?? (authUser as any)._id ?? '';
        // Ensure it's a string
        currentUserId = currentUserId ? String(currentUserId) : '';
      }

      const doctorsForCurrentUser = clinicDoctors.filter(d => d.id === currentUserId);

      if (doctorsForCurrentUser.length > 0) {
        this.doctors = doctorsForCurrentUser;
      } else {
        // Default: show clinic-specific doctors; if none, show fallback
        this.doctors = clinicDoctors.length > 0 ? clinicDoctors : fallback;
      }

      if (this.doctors.length === 1) {
        this.selectedDoctor = this.doctors[0].id;
        this.loadSlotsForDoctor(this.selectedDoctor);
      }
    });
  }

  /** LOAD BOOKED APPOINTMENTS */
  /** LOAD BOOKED APPOINTMENTS */
  loadBookedAppointments(doctorId?: string) {

    this.appointmentService.getAppointments()
      .subscribe((appointments: any[]) => {

        console.log('loadBookedAppointments -> doctorId:', doctorId);
        console.log('loadBookedAppointments -> appointments:', appointments);

        const items = Array.isArray(appointments) ? appointments : [];

        const matchesDoctor = (a: any, id?: string) => {
          if (!id) return true; // no filter
          if (!a) return false;
          if (a.resourceId && a.resourceId === id) return true;
          if (a.doctorId && a.doctorId === id) return true;
          if (a.doctor && (a.doctor === id || a.doctor.id === id)) return true;
          if (a.resource && (a.resource === id || a.resource.id === id)) return true;
          return false;
        };

        const filtered = items.filter(a => matchesDoctor(a, doctorId));

        console.log('loadBookedAppointments -> filtered count:', filtered.length);

        // If appointments don't contain doctor/resource identifiers, fall back
        // to matching by date+timeSlot when viewing a single doctor's calendar.
        let toMark = filtered;
        if (doctorId && toMark.length === 0) {
          const fallback = items.filter(a => a && a.appointmentDate && a.timeSlot && a.status === 'BOOKED');
          console.log('loadBookedAppointments -> fallback by date/time count:', fallback.length);
          toMark = fallback;
        }

        toMark.forEach(a => {

          const date = a.appointmentDate;

          const slot = this.scheduledSlots[date]
            ?.find(s => s.time === a.timeSlot);

          if (slot) {

            console.log('marking slot booked:', { date, time: a.timeSlot, appointment: a });
            slot.status = 'booked';

              slot.bookingInfo = {
                  fullName: a.fullName,
                  phone: a.phone,
                  purpose: a.purpose || a.message || a.email || '',
                  appointmentId: a.id || a._id || a.appointmentId || ''
                };

          } else {
            console.log('booked appointment has no matching slot in scheduledSlots:', { date, time: a.timeSlot, appointment: a });
          }

        });

        this.buildWeek();

      });

  }

  onDoctorChange() {

    if (!this.selectedDoctor) return;

    this.loadSlotsForDoctor(this.selectedDoctor);

  }

  loadSlotsForDoctor(doctorId: string) {
    // Resolve current logged-in user id to filter slots by creator
    const authUser = this.authService.getCurrentUser();
    let currentUserId = '';
    if (authUser) {
      currentUserId = (authUser as any).userId ?? (authUser as any).mongoId ?? (authUser as any).id ?? (authUser as any)._id ?? '';
      currentUserId = currentUserId ? String(currentUserId) : '';
    }

    const schedulers$ = currentUserId ? this.schedulerService.getSchedulersByCreator(currentUserId) : this.schedulerService.getSchedulers();

    schedulers$.subscribe((schedulers: any[]) => {
        console.log('loadSlotsForDoctor -> doctorId:', doctorId);
        console.log('loadSlotsForDoctor -> schedulers response:', schedulers);

        this.scheduledSlots = {};

        schedulers.forEach(scheduler => {

          // scheduler can reference doctors in different shapes:
          // - scheduler.doctorIds: array of doctor ids
          // - scheduler.resourceId: single resource id (resourceType === 'DOCTOR')
          // daySlots may be at scheduler.daySlots or nested under scheduler.resourceSchedules[].daySlots

          const resourceId = scheduler.resourceId ?? scheduler.resourceSchedules?.[0]?.resourceId;
          const daySlotsList: any[] = scheduler.daySlots ?? (Array.isArray(scheduler.resourceSchedules)
            ? scheduler.resourceSchedules.flatMap((rs: any) => rs.daySlots || [])
            : []);

          const matchesDoctor = (Array.isArray(scheduler.doctorIds) && scheduler.doctorIds.includes(doctorId))
            || (resourceId === doctorId);

          if (!matchesDoctor) {
            console.log('skipping scheduler (no match): doctorIds=', scheduler.doctorIds, 'resourceId=', resourceId);
            return;
          }

          console.log('using scheduler (matched):', scheduler.id ?? resourceId ?? scheduler);

          daySlotsList.forEach((day: any) => {

            // Normalize date key: scheduler may provide date as string or Date
              const rawDate = day.date;

              // Normalize incoming date values to a canonical YYYY-MM-DD key.
              // Handles these shapes: "YYYY-MM-DD", ISO strings, timestamps, Date objects,
              // and Mongo extended JSON-like objects.
              let key = '';
              if (typeof rawDate === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                  // plain date string (treat as local date)
                  key = rawDate;
                } else {
                  // other string forms: parse to Date and format to local date
                  key = this.formatDate(new Date(rawDate));
                }
              } else if (typeof rawDate === 'number') {
                key = this.formatDate(new Date(rawDate));
              } else if (rawDate instanceof Date) {
                key = this.formatDate(rawDate);
              } else if (rawDate && (rawDate.$date || rawDate.$numberLong)) {
                // Mongo extended JSON: { $date: { $numberLong: "..." } } or { $date: "..." }
                const millis = rawDate.$date && rawDate.$date.$numberLong ? Number(rawDate.$date.$numberLong) : (rawDate.$date || rawDate.$numberLong);
                key = this.formatDate(new Date(millis));
              } else {
                key = this.formatDate(new Date(rawDate));
              }

              console.log('processing day:', { rawDate, key, slotsCount: (day.slots || []).length });

            if (!this.scheduledSlots[key]) {
              this.scheduledSlots[key] = [];
            }

            day.slots.forEach((slot: any) => {

              // Determine the creator/owner of this slot (defensive across shapes)
              let slotOwner: any = '';
              if (slot) {
                if (slot.createdBy && typeof slot.createdBy === 'object') {
                  slotOwner = slot.createdBy.id ?? slot.createdBy._id ?? slot.createdBy;
                } else {
                  slotOwner = slot.createdBy ?? slot.createdById ?? slot.userId ?? slot.creator ?? slot.createdByUserId ?? '';
                }
              }
              slotOwner = slotOwner ? String(slotOwner) : '';

              // If we have a logged-in user id, only include slots created by that user
              if (currentUserId && slotOwner && slotOwner !== currentUserId) {
                console.log('skipping slot because creator does not match current user', { slotOwner, currentUserId, slot });
                return;
              }

              const time = this.formatTime(slot.start) + " - " + this.formatTime(slot.end);

              console.log('adding slot for', key, time);
              const slotId = slot.slotId || slot.id || slot._id || '';
              this.scheduledSlots[key].push({
                time,
                status: 'open',
                schedulerId: scheduler.id || '',
                resourceId: resourceId || '',
                slotId
              });

            });

          });

        });

        console.log('scheduledSlots built:', this.scheduledSlots);

        // mark any already-booked slots for this doctor and refresh week view
        this.loadBookedAppointments(doctorId);

      });

  }

  formatTime(time: string): string {

    const [hour, minute] = time.split(':').map(Number);

    const ampm = hour >= 12 ? 'PM' : 'AM';

    const h = hour % 12 || 12;

    return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;

  }

  /** WEEK VIEW */

  setWeekStart(date: Date) {

    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());

    this.currentWeekStart = d;

    this.buildWeek();
  }

  buildWeek() {

    this.weekDays = [];

    for (let i = 0; i < 7; i++) {

      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);

      const key = this.formatDate(d);

      this.weekDays.push({
        date: d,
        slots: this.scheduledSlots[key] || []
      });

    }

    // Debug: show which date keys correspond to the current week and what slots map to them.
    try {
      const weekKeys = this.weekDays.map(w => this.formatDate(w.date));
      console.log('buildWeek -> weekKeys:', weekKeys);
      console.log('buildWeek -> scheduledSlots keys present:', Object.keys(this.scheduledSlots || {}));
      this.weekDays.forEach(w => console.log('buildWeek -> day', this.formatDate(w.date), 'slots:', (w.slots || []).length));
    } catch (e) {
      // ignore logging errors in production
    }

  }

  prevWeek() {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() - 7);
    this.setWeekStart(d);
    this.buildMiniCalendar(d);
  }

  nextWeek() {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() + 7);
    this.setWeekStart(d);
    this.buildMiniCalendar(d);
  }

  /** MINI CALENDAR */

  buildMiniCalendar(base: Date) {

    const year = base.getFullYear();
    const month = base.getMonth();
    const today = new Date();

    this.miniMonthYear = base.toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    this.miniDays = [];

    for (let i = 0; i < firstDay; i++) {
      this.miniDays.push({ day: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {

      const date = new Date(year, month, d);

      this.miniDays.push({
        day: d,
        date,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: date.toDateString() === base.toDateString()
      });

    }
  }

  onMiniDateClick(day: MiniDate) {

    if (!day.date) return;

    this.setWeekStart(day.date);
    this.buildMiniCalendar(day.date);
  }

  formatDate(d: Date): string {

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  }

  /** BOOK SLOT */

  openBooking(slot: Slot, day: Date) {

    if (slot.status === 'booked') {
      // open cancel dialog for booked slot
      this.openCancelDialog(slot, day);
      return;
    }

    this.selectedSlot = slot;
    this.selectedDay = day;

    this.showModal = true;
  }

  onSlotClick(slot: Slot, day: Date) {
    // unified handler used from template
    this.openBooking(slot, day);
  }

  openCancelDialog(slot: Slot, day: Date) {
    this.cancelTargetSlot = slot;
    this.cancelTargetDate = day;
    this.showCancelModal = true;
  }

  closeCancelDialog() {
    this.showCancelModal = false;
    this.cancelTargetSlot = undefined;
    this.cancelTargetDate = undefined;
  }

  confirmCancel() {
    if (!this.cancelTargetSlot) return;
    const id = this.cancelTargetSlot.bookingInfo?.appointmentId;
    if (!id) {
      // fallback: try to find appointment by date+time via API (not implemented)
      console.warn('No appointmentId on slot; cannot cancel via API');
      this.closeCancelDialog();
      return;
    }

    this.appointmentService.deleteAppointment(id).subscribe(() => {
      // After appointment deletion, also remove the concrete slot from the scheduler (date-specific)
      const slot = this.cancelTargetSlot!;
      const dateKey = this.cancelTargetDate ? this.formatDate(this.cancelTargetDate) : '';

      if (slot.schedulerId && slot.resourceId && slot.slotId) {
        this.schedulerService.deleteSlot(slot.schedulerId, slot.resourceId, slot.slotId, dateKey)
          .subscribe(() => {
            // remove slot instance from local cache for that date
            this.scheduledSlots[dateKey] = (this.scheduledSlots[dateKey] || []).filter(s => s.slotId !== slot.slotId || s.time !== slot.time);
            this.closeCancelDialog();
            this.buildWeek();
          }, err => {
            console.error('Failed to delete slot from scheduler', err);
            // fallback: mark slot open locally
            slot.status = 'open';
            slot.bookingInfo = undefined;
            this.closeCancelDialog();
            this.buildWeek();
          });
      } else {
        // If we don't have scheduler metadata, remove by matching time as a best-effort
        if (dateKey) {
          this.scheduledSlots[dateKey] = (this.scheduledSlots[dateKey] || []).filter(s => s.time !== slot.time);
        }
        slot.status = 'open';
        slot.bookingInfo = undefined;
        this.closeCancelDialog();
        this.buildWeek();
      }
    }, err => {
      console.error('Failed to cancel appointment', err);
      this.closeCancelDialog();
    });
  }

  confirmBooking() {

    this.submitted = true;

    if (!this.patient.fullName) return;
    if (!this.patient.phone || this.patient.phone.length < 10) return;

    const payload = {

      appointmentDate: this.formatDate(this.selectedDay),
      timeSlot: this.selectedSlot.time,
      fullName: this.patient.fullName,
      phone: this.patient.countryCode + this.patient.phone,
      purpose: this.patient.purpose

    };

    this.appointmentService.createAppointment(payload)
      .subscribe((res: any) => {

        this.selectedSlot.status = 'booked';

        this.selectedSlot.bookingInfo = {
          fullName: this.patient.fullName,
          phone: payload.phone,
          purpose: this.patient.purpose,
          appointmentId: res?.id || res?._id || res?.appointmentId || ''
        };

        // Send WhatsApp confirmation message
        try {
          const clinicName = 'Clinic Pro';
          const clinicAddress = '12 Health St, Wellness City, 400001';

          const doctor = (this.doctors || []).find(d => d.id === (this.selectedSlot.resourceId || this.selectedDoctor));
          const doctorName = doctor ? doctor.name : '';

          const dateStr = this.selectedDay ? this.selectedDay.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : this.formatDate(new Date(this.selectedSlot?.time || ''));

          const message = `Hello ${this.patient.fullName}, your appointment at ${clinicName}${doctorName ? ' with ' + doctorName : ''} is confirmed for ${dateStr} at ${this.selectedSlot.time}. Appointment ID: ${this.selectedSlot.bookingInfo.appointmentId}. Address: ${clinicAddress}.`;

          const sendPayload = { number: payload.phone, message };

          const url = `${environment.apiGatewayUrl}/api/whatsapp/sendmessage`;

          this.http.post(url, sendPayload).subscribe(() => {
            console.log('WhatsApp confirmation sent to', payload.phone);
          }, err => {
            console.warn('Failed to send WhatsApp confirmation', err);
          });
        } catch (e) {
          console.warn('WhatsApp send skipped due to error', e);
        }

        this.closeModal();

      });

  }

  closeModal() {

    this.showModal = false;

    document.body.style.overflow = 'auto';
  }

  allowOnlyNumbers(event: KeyboardEvent) {

    const code = event.key.charCodeAt(0);

    if (code < 48 || code > 57) {
      event.preventDefault();
    }
  }

  isValidEmail(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

}