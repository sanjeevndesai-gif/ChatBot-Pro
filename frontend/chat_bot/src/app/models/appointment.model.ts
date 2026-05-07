export interface Appointment {
    id?: string;
    fullName: string;
    phone: string;
    email?: string;
    message?: string;
    appointmentDate: string;
    timeSlot: string;
    doctorId?: string;
    status?: 'open' | 'booked' | 'cancelled';
}

export interface Scheduler {
    id?: string;
    title?: string;
    description?: string;
    doctorIds: string[];
    daySlots: DaySlot[];
    repeatOption?: 'none' | 'weekly' | 'custom';
}

export interface DaySlot {
    date: string;
    slots: SlotEntry[];
}

export interface SlotEntry {
    time: string;
    duration: number;
    emergency?: boolean;
    status?: 'open' | 'booked';
}
