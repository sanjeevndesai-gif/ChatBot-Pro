import { Component, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions, EventInput } from '@fullcalendar/core';

interface Slot {
  id: string;
  start: string;
  end: string;
  emergency: boolean;
}

interface MiniDay {
  day: number | '';
  isToday: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule],
  templateUrl: './appointments.html',
  styleUrls: ['./appointments.scss']
})
export class Appointments implements AfterViewInit {

  users: any[] = [];
  selectedDoctor: string = '';

  // Only show doctors in dropdown
  getDoctors() {
    return this.users.filter((user: any) => user.role === 'doctor');
  }

  @ViewChild('calendarRef') calendarRef!: FullCalendarComponent;

  constructor(private cdr: ChangeDetectorRef) {}

  /* ---------------- HEADER ---------------- */
  currentTitle = 'Appointment Calendar';
  currentView = 'timeGridWeek';

  /* ---------------- SLOT DATA ---------------- */
  daySlots: { label: string; unavailable: boolean; slots: Slot[] }[] = [];

  /* ---------------- MINI CALENDAR ---------------- */
  selectedMiniDate = new Date();
  miniMonth = '';
  miniCalendarDays: MiniDay[] = [];

  /* ---------------- MODALS ---------------- */
  actionModalOpen = false;
  rescheduleModalOpen = false;

  selectedEvent: any = null;

  selectedSlotId: string | null = null;
  selectedDayIndex: number | null = null;

  rescheduleDate = '';
  rescheduleStart = '';
  rescheduleEnd = '';

  /* ---------------- CALENDAR OPTIONS ---------------- */
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    eventInteractive: true,
    initialView: 'timeGridWeek',
    headerToolbar: false,
    allDaySlot: false,
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    height: 'auto',
    editable: false,
    selectable: false,
    

    events: [],

    eventClick: (info) => {
      this.onEventClick(info);
    },

    eventDidMount: (arg) => {
      // ✅ Force event to be clickable
      (arg.el as HTMLElement).style.pointerEvents = 'auto';
      (arg.el as HTMLElement).style.cursor = 'pointer';
      (arg.el as HTMLElement).style.zIndex = '9999';
    },

    datesSet: (arg) => {
      this.currentTitle = arg.view.title;
      setTimeout(() => this.syncCalendar(), 0);
    }
  };

  /* ---------------- LIFECYCLE ---------------- */
  ngAfterViewInit() {
    this.initDaySlots();
    this.loadDummyAppointmentsToSlots();
    this.buildMiniCalendar();

    // initial calendar sync
    setTimeout(() => this.syncCalendar(), 0);
  }

  initDaySlots() {
    const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.daySlots = labels.map(l => ({
      label: l,
      unavailable: false,
      slots: []
    }));
  }

  loadDummyAppointmentsToSlots() {
    // Monday
    this.daySlots[1].slots.push(
      this.makeSlot('10:00', '10:30', false),
      this.makeSlot('12:00', '12:45', false)
    );

    // Tuesday
    this.daySlots[2].slots.push(this.makeSlot('09:30', '10:15', false));

    // Wednesday
    this.daySlots[3].slots.push(this.makeSlot('15:00', '16:00', false));

    // Saturday emergency
    this.daySlots[6].slots.push(this.makeSlot('18:00', '18:30', true));
  }

  private makeSlot(start: string, end: string, emergency: boolean): Slot {
    return { id: crypto.randomUUID(), start, end, emergency };
  }

  /* ---------------- FULLCALENDAR SYNC ---------------- */
  syncCalendar() {
    if (!this.calendarRef) return;

    const api = this.calendarRef.getApi();
    api.removeAllEvents();

    const base = api.view.currentStart;

    this.daySlots.forEach((d, di) => {
      if (d.unavailable) return;

      const date = new Date(base);
      date.setDate(base.getDate() + di);

      d.slots.forEach(s => {
        const [sh, sm] = s.start.split(':').map(Number);
        const [eh, em] = s.end.split(':').map(Number);

        const st = new Date(date);
        st.setHours(sh, sm, 0, 0);

        const en = new Date(date);
        en.setHours(eh, em, 0, 0);

        api.addEvent({
          id: s.id,
          title: s.emergency ? 'Emergency' : 'Booked',
          start: st,
          end: en,
          className: s.emergency ? 'fc-emergency' : 'fc-general',
          extendedProps: {
            slotId: s.id,
            dayIndex: di
          }
        } as EventInput);
      });
    });
  }

  /* ---------------- EVENT CLICK ---------------- */
  // onEventClick(info: any) {
  //   try {
  //     info.jsEvent.preventDefault();
  //     info.jsEvent.stopPropagation();
  //   } catch {}

  //   this.selectedEvent = info.event;
  //   this.selectedSlotId = info.event.extendedProps?.slotId;
  //   this.selectedDayIndex = info.event.extendedProps?.dayIndex;

  //   // ✅ open modal
  //   this.actionModalOpen = true;

  //   // ✅ force angular UI refresh
  //   this.cdr.detectChanges();
  onEventClick(info: any) {

    info.jsEvent.preventDefault();
    info.jsEvent.stopPropagation();

    this.selectedEvent = info.event;
    this.selectedSlotId = info.event.extendedProps.slotId;
    this.selectedDayIndex = info.event.extendedProps.dayIndex;

    // force modal open
    this.actionModalOpen = false;

    setTimeout(() => {
      this.actionModalOpen = true;
      this.cdr.detectChanges();
    }, 0);
  }



  /* ---------------- RESCHEDULE ---------------- */
  openReschedule() {
    if (!this.selectedEvent) return;

    const ev = this.selectedEvent;

    this.rescheduleDate = ev.startStr.split('T')[0];
    this.rescheduleStart = ev.startStr.split('T')[1].substring(0, 5);
    this.rescheduleEnd = ev.endStr.split('T')[1].substring(0, 5);

    this.actionModalOpen = false;
    this.rescheduleModalOpen = true;

    this.cdr.detectChanges();
  }

  // saveReschedule() {
  //   if (this.selectedDayIndex === null || !this.selectedSlotId) return;

  //   const slot = this.daySlots[this.selectedDayIndex].slots.find(x => x.id === this.selectedSlotId);
  //   if (!slot) return;

  //   slot.start = this.rescheduleStart;
  //   slot.end = this.rescheduleEnd;

  //   this.syncCalendar();
  //   this.closeAllModals();
  // }
  saveReschedule() {

    if (this.selectedDayIndex === null || !this.selectedSlotId) return;

    const slot =
      this.daySlots[this.selectedDayIndex].slots.find(x => x.id === this.selectedSlotId);

    if (!slot) return;

    slot.start = this.rescheduleStart;
    slot.end = this.rescheduleEnd;

    this.syncCalendar();
    this.closeAllModals();
  }


  /* ---------------- CANCEL SLOT ---------------- */
  // cancelSlot() {
  //   if (this.selectedDayIndex === null || !this.selectedSlotId) return;

  //   this.daySlots[this.selectedDayIndex].slots =
  //     this.daySlots[this.selectedDayIndex].slots.filter(x => x.id !== this.selectedSlotId);

  //   this.syncCalendar();
  //   this.closeAllModals();
  // }
  cancelSlot() {

    if (this.selectedDayIndex === null || !this.selectedSlotId) return;

    this.daySlots[this.selectedDayIndex].slots =
      this.daySlots[this.selectedDayIndex].slots.filter(x => x.id !== this.selectedSlotId);

    this.syncCalendar();
    this.closeAllModals();
  }


  closeAllModals() {
    this.actionModalOpen = false;
    this.rescheduleModalOpen = false;

    this.selectedEvent = null;
    this.selectedSlotId = null;
    this.selectedDayIndex = null;

    this.cdr.detectChanges();
  }

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
        isToday: d === today.getDate() && m === today.getMonth() && y === today.getFullYear(),
        isSelected: false
      });
    }
  }

  miniDateClick(d: MiniDay) {
    if (!d.day) return;

    this.miniCalendarDays.forEach(x => (x.isSelected = false));
    d.isSelected = true;

    const selected = new Date(
      this.selectedMiniDate.getFullYear(),
      this.selectedMiniDate.getMonth(),
      d.day
    );

    this.calendarRef.getApi().gotoDate(selected);
    this.syncCalendar();
  }

  prevMini() {
    this.selectedMiniDate.setMonth(this.selectedMiniDate.getMonth() - 1);
    this.buildMiniCalendar();
  }

  nextMini() {
    this.selectedMiniDate.setMonth(this.selectedMiniDate.getMonth() + 1);
    this.buildMiniCalendar();
  }

  /* ---------------- HEADER CONTROLS ---------------- */
  changeView(view: string) {
    this.currentView = view;
    this.calendarRef.getApi().changeView(view);
  }

  prev() {
    this.calendarRef.getApi().prev();
    this.syncCalendar();
  }

  next() {
    this.calendarRef.getApi().next();
    this.syncCalendar();
  }

  onAddSchedule() {
    alert('Add Schedule clicked (connect your drawer/modal here)');
  }
}
