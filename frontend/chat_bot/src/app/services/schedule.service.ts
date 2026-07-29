import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import { tap } from 'rxjs/operators';
import { isValidSchedule } from './schedule.validator';
import { ScheduleItem } from '../models/schedule.model';
import { StorageService } from '../core/services/storage.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ScheduleService {

    private readonly CACHE_KEY = 'schedules';
    private readonly SCHEMA_VERSION = 'v1';
    private readonly VERSION_KEY = 'schedules_version';

    constructor(
        private readonly http: HttpClient,
        private readonly config: ConfigService,
        private readonly logger: LoggerService,
        private readonly storage: StorageService,
        private readonly auth: AuthService
    ) { }

    fetchSchedules() {
        // Prefer requesting schedules scoped to the logged-in user (backend will
        // resolve clinic association from JWT). Fall back to unscoped request if no token.
        const token = this.auth.getToken();
        // book_appointment service has its own base URL (may differ from auth)
        const clinicMe = `${environment.appointment_apiBaseUrl}/clinic/me`;
        const fallback = `${environment.appointment_apiBaseUrl}`;

        const userId = this.auth.getUserId();

        // Debug: log invocation and target endpoints so we can see calls in browser console
        try {
            // eslint-disable-next-line no-console
            console.log('ScheduleService.fetchSchedules called', {
                tokenPresent: !!token,
                userId: userId,
                clinicMe,
                fallback
            });
        } catch (e) {
            // ignore
        }

        if (token) {
            const headers: any = { Authorization: `Bearer ${token}` };
            if (userId) headers['X-User-Id'] = userId;
            return this.http.get<any[]>(clinicMe, { headers });
        }

        return this.http.get<any[]>(fallback);
    }

    updateAppointment(id: string, payload: any) {
        const normalizeId = (raw: any): string => {
            if (raw == null) return '';
            if (typeof raw === 'string') return raw;
            try {
                if (typeof raw === 'object') {
                    if (raw['$oid']) return String(raw['$oid']);
                    if (raw['oid']) return String(raw['oid']);
                    if (raw['id']) return String(raw['id']);
                    if (raw['_id'] && typeof raw['_id'] === 'object') {
                        if (raw['_id']['$oid']) return String(raw['_id']['$oid']);
                        if (raw['_id']['oid']) return String(raw['_id']['oid']);
                    }
                }
            } catch (e) {
                // fallthrough
            }
            try { return String(raw); } catch { return '' }
        };

        const idStr = normalizeId(id);
        const token = this.auth.getToken();
        const url = `${environment.appointment_apiBaseUrl}/${idStr}`;
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const userId = this.auth.getUserId();
        if (userId) headers['X-User-Id'] = userId;
        // Log outgoing request for debugging
        try {
            this.logger.info('Sending update to backend', { url, payload, headers });
            // eslint-disable-next-line no-console
            console.log('ScheduleService.updateAppointment ->', { url, payload, headers });
        } catch (e) {}

        return this.http.put<any>(url, payload, { headers }).pipe(
            tap({
                next: (res) => {
                    try { this.logger.info('Update response received', res); } catch(e) {}
                    // eslint-disable-next-line no-console
                    console.log('ScheduleService.updateAppointment response', res);
                },
                error: (err) => {
                    try { this.logger.error('Update response error', err); } catch(e) {}
                    // eslint-disable-next-line no-console
                    console.error('ScheduleService.updateAppointment error', err);
                }
            })
        );
    }

    saveToLocal(data: ScheduleItem[]): void {
        this.storage.setItem(this.CACHE_KEY, data);
        this.storage.setString(this.VERSION_KEY, this.SCHEMA_VERSION);
    }

    loadFromLocal(): ScheduleItem[] {
        const version = this.storage.getString(this.VERSION_KEY);

        if (version !== this.SCHEMA_VERSION) {
            this.storage.removeItem(this.CACHE_KEY);
            this.storage.setString(this.VERSION_KEY, this.SCHEMA_VERSION);
            return [];
        }

        return this.storage.getItem<ScheduleItem[]>(this.CACHE_KEY) ?? [];
    }

    processApiData(data: any[]): ScheduleItem[] {
        // Map a variety of backend appointment shapes into the UI-friendly ScheduleItem
        const mapped = (data || []).map(item => this.mapToScheduleItem(item));

        const valid = mapped.filter(isValidSchedule);
        this.saveToLocal(valid);
        return valid;
    }

    private mapToScheduleItem(item: any): ScheduleItem {
        // Helpers
        const pick = (...keys: string[]) => {
            for (const k of keys) {
                if (item == null) continue;
                const v = item[k];
                if (v !== undefined && v !== null && v !== '') return v;
            }
            return null;
        };

        const extractObjectId = (obj: any, depth = 0): string | null => {
            if (obj == null || depth > 3) return null;
            if (typeof obj === 'string') {
                if (/^[a-fA-F0-9]{24}$/.test(obj)) return obj;
                return null;
            }
            if (typeof obj === 'object') {
                // common shape: { $oid: '...' }
                if (obj['$oid'] && typeof obj['$oid'] === 'string') return obj['$oid'];
                if (obj['oid'] && typeof obj['oid'] === 'string') return obj['oid'];
                if (obj['id'] && typeof obj['id'] === 'string' && /^[a-fA-F0-9]{24}$/.test(obj['id'])) return obj['id'];
                // traverse nested fields
                for (const k of Object.keys(obj)) {
                    try {
                        const found = extractObjectId(obj[k], depth + 1);
                        if (found) return found;
                    } catch (e) { /* ignore */ }
                }
                return null;
            }
            return null;
        };

        const toId = (): string => {
            // Prefer orgId as the customer identifier when available
            const v = pick('orgId', 'id', '_id', 'appointmentNumber', 'bookingId', 'booking_id');
            if (!v) return '';
            if (typeof v === 'object') {
                const extracted = extractObjectId(v);
                if (extracted) return extracted;
                try { return JSON.stringify(v); } catch { return '' }
            }
            return String(v);
        };

        const toName = (): string => {
            // Prefer fullName if provided by backend
            return String(pick('fullName', 'patientName', 'name', 'fullname', 'customerName', 'clientName', 'title') || '');
        };

        const parseDate = (raw: any): string => {
            if (!raw) return '';
            // Common backend fields: appointmentDate (YYYY-MM-DD or ISO), date
            let s = String(raw);
            // If already DD/MM/YYYY, return
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

            // If ISO or YYYY-MM-DD
            const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                const year = isoMatch[1], month = isoMatch[2], day = isoMatch[3];
                return `${day}/${month}/${year}`;
            }

            // As fallback, try Date parse
            const dt = new Date(s);
            if (!isNaN(dt.getTime())) {
                const dd = String(dt.getDate()).padStart(2,'0');
                const mm = String(dt.getMonth()+1).padStart(2,'0');
                const yyyy = dt.getFullYear();
                return `${dd}/${mm}/${yyyy}`;
            }
            return '';
        };

        const toSlot = (): string => {
            const s = pick('slot', 'timeslot', 'timeSlot', 'appointmentTime', 'time', 'startTime', 'endTime');
            if (!s) {
                // maybe start & end separate
                const st = pick('startTime', 'from');
                const en = pick('endTime', 'to');
                if (st && en) return `${String(st)} - ${String(en)}`;
                return '';
            }
            return String(s);
        };

        const toStatus = (): 'Active'|'Completed'|'Pending'|'Cancelled'|'Inactive' => {
            const raw = String(pick('status', 'bookingStatus', 'state', 'appointmentStatus') || '').toUpperCase();

            if (!raw) return 'Pending';
            // Treat explicit INACTIVE as Inactive before matching ACTIVE substring
            if (raw.includes('INACT') || raw === 'INACTIVE') return 'Inactive';
            if (raw.includes('BOOK') || raw === 'BOOKED' || raw === 'ACTIVE') return 'Active';
            if (raw.includes('CANCEL')) return 'Cancelled';
            if (raw.includes('COMPLETE') || raw.includes('DONE')) return 'Completed';
            if (raw.includes('PEND')) return 'Pending';
            return 'Pending';
        };

        const toRawId = (): string => {
            const v = pick('_id', 'id', 'appointmentNumber', 'bookingId');
            if (!v) return '';
            if (typeof v === 'object') {
                const extracted = extractObjectId(v);
                if (extracted) return extracted;
                try { return JSON.stringify(v); } catch { return '' }
            }
            return String(v);
        };

        const toAppointmentNumber = (): string => {
            // appointmentNumber may be a string or an object containing appointmentNumber field
            const v = pick('appointmentNumber');
            if (!v) return '';
            if (typeof v === 'string') return v;
            if (typeof v === 'object') {
                if (v['appointmentNumber'] && typeof v['appointmentNumber'] === 'string') return v['appointmentNumber'];
                if (v['appointment_no'] && typeof v['appointment_no'] === 'string') return v['appointment_no'];
                // fallback to stringify
                try { return JSON.stringify(v); } catch { return '' }
            }
            return String(v);
        };

        const schedule: ScheduleItem = {
            id: toId(),
            rawId: toRawId(),
            appointmentNumber: toAppointmentNumber(),
            name: toName(),
            date: parseDate(pick('appointmentDate', 'date', 'scheduledDate', 'day')),
            slot: toSlot(),
            status: toStatus(),
            phone: String(pick('phone', 'mobile', 'contact', 'phoneNumber') || ''),
            doctorName: String(pick('doctorName', 'doctor', 'practitioner', 'provider', 'doctor_name') || ''),
            reportStatus: (() => {
                const raw = pick('reportStatus', 'reported', 'isReported');
                if (raw === null) return 'Reported';
                const s = String(raw).toLowerCase();
                if (s === 'true' || s === 'reported' || s === '1' || s === 'yes') return 'Reported';
                return 'Not Reported';
            })(),
            reportReason: String(pick('reportReason', 'reason') || '')
        };

        return schedule;
    }
}

