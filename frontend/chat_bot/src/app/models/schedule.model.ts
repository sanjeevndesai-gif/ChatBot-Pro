export interface ScheduleItem {
    id: string;
    rawId?: string;
    appointmentNumber?: string;
    name: string;
    date: string; // DD/MM/YYYY
    slot: string; // HH:MM AM - HH:MM PM
    status: 'Active' | 'Completed' | 'Pending' | 'Cancelled' | 'Inactive';
    phone?: string;
    reportStatus?: 'Reported' | 'Not Reported';
    reportReason?: string;
}
