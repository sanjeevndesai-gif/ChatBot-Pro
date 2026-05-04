import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { SchedulerService } from '../../services/scheduler.service';

interface BookingInfo {
  fullName: string;
  phone: string;
}

interface Slot {
  time: string;
  status: 'open' | 'booked';
  bookingInfo?: BookingInfo;
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
    private schedulerService: SchedulerService
  ) { }

  doctors: string[] = [];
  selectedDoctor: string = '';

  currentWeekStart!: Date;
  weekDays: DaySlots[] = [];

  miniDays: MiniDate[] = [];
  miniMonthYear = '';

  showModal = false;
  selectedDay!: Date;
  selectedSlot!: Slot;

  submitted = false;

  patient = {
    fullName: '',
    countryCode: '+91',
    phone: '',
    email: '',
    message: ''
  };

  /** backend slots storage */
  scheduledSlots: Record<string, Slot[]> = {};

  ngOnInit() {

    const today = new Date();

    this.setWeekStart(today);
    this.buildMiniCalendar(today);

    this.loadSlots();
  }

  /** LOAD SLOTS FROM SCHEDULER */
  loadSlots() {

    this.schedulerService.getSchedulers()
      .subscribe((schedulers: any[]) => {

        const doctorSet = new Set<string>();

        schedulers.forEach(s => {

          if (s.doctorIds) {
            s.doctorIds.forEach((d: string) => doctorSet.add(d));
          }

        });

        this.doctors = Array.from(doctorSet);

      });

  }

  /** LOAD BOOKED APPOINTMENTS */
  loadBookedAppointments() {

    this.appointmentService.getAppointments()
      .subscribe((appointments: any[]) => {

        appointments.forEach(a => {

          const date = a.appointmentDate;

          const slot = this.scheduledSlots[date]
            ?.find(s => s.time === a.timeSlot);

          if (slot) {

            slot.status = 'booked';

            slot.bookingInfo = {
              fullName: a.fullName,
              phone: a.phone
            };

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

    this.schedulerService.getSchedulers()
      .subscribe((schedulers: any[]) => {

        this.scheduledSlots = {};

        schedulers.forEach(scheduler => {

          if (!scheduler.doctorIds?.includes(doctorId)) return;

          scheduler.daySlots.forEach((day: any) => {

            const date = day.date;

            if (!this.scheduledSlots[date]) {
              this.scheduledSlots[date] = [];
            }

            day.slots.forEach((slot: any) => {

              const time = this.formatTime(slot.start) + " - " + this.formatTime(slot.end);

              this.scheduledSlots[date].push({
                time,
                status: 'open'
              });

            });

          });

        });

        this.loadBookedAppointments();

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

    if (slot.status === 'booked') return;

    this.selectedSlot = slot;
    this.selectedDay = day;

    this.showModal = true;
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
      email: this.patient.email,
      message: this.patient.message

    };

    this.appointmentService.createAppointment(payload)
      .subscribe(() => {

        this.selectedSlot.status = 'booked';

        this.selectedSlot.bookingInfo = {
          fullName: this.patient.fullName,
          phone: payload.phone
        };

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