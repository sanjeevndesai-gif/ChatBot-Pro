export interface ScheduleItem {
    id: string;
    name: string;
    date: string; // DD/MM/YYYY
    slot: string; // HH:MM AM - HH:MM PM
    status: 'Active' | 'Completed' | 'Pending' | 'Cancelled';
}
