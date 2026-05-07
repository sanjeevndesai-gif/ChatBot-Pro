import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { isValidSchedule } from './schedule.validator';
import { ScheduleItem } from '../models/schedule.model';

@Injectable({ providedIn: 'root' })
export class ScheduleService {

    private CACHE_KEY = 'schedules';
    private SCHEMA_VERSION = 'v1';  // bump this when fields change
    private VERSION_KEY = 'schedules_version';


    constructor(
        private http: HttpClient,
        private config: ConfigService,
        private logger: LoggerService
    ) { }

    fetchSchedules() {
        return this.http.get<any[]>(`${this.config.apiBaseUrl}/api/schedules`);
    }

    saveToLocal(data: ScheduleItem[]) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(this.VERSION_KEY, this.SCHEMA_VERSION);
    }

    loadFromLocal(): ScheduleItem[] {
        const version = localStorage.getItem(this.VERSION_KEY);

        // If version mismatch → clear
        if (version !== this.SCHEMA_VERSION) {
            console.warn('❗ Schema changed → Clearing old localStorage');
            localStorage.removeItem(this.CACHE_KEY);
            localStorage.setItem(this.VERSION_KEY, this.SCHEMA_VERSION);
            return [];
        }

        const raw = localStorage.getItem(this.CACHE_KEY);
        return raw ? JSON.parse(raw) : [];
    }


    processApiData(data: any[]): ScheduleItem[] {
        const valid = data.filter(isValidSchedule);
        this.saveToLocal(valid);
        return valid;
    }
}

