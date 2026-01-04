import { ScheduleItem } from '../models/schedule.model';

export function isValidSchedule(item: any): item is ScheduleItem {
    return (
        typeof item?.id === 'string' &&
        typeof item?.name === 'string' &&
        typeof item?.date === 'string' &&
        typeof item?.slot === 'string' &&
        ['Active', 'Completed', 'Pending', 'Cancelled'].includes(item?.status)
    );
}
