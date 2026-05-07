import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { isValidSchedule } from './schedule.validator';
import { ScheduleItem } from '../models/schedule.model';
import { StorageService } from '../core/services/storage.service';

@Injectable({ providedIn: 'root' })
export class ScheduleService {

    private readonly CACHE_KEY = 'schedules';
    private readonly SCHEMA_VERSION = 'v1';
    private readonly VERSION_KEY = 'schedules_version';

    constructor(
        private readonly http: HttpClient,
        private readonly config: ConfigService,
        private readonly logger: LoggerService,
        private readonly storage: StorageService
    ) { }

    fetchSchedules() {
        return this.http.get<any[]>(`${this.config.apiBaseUrl}/api/schedules`);
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
        const valid = data.filter(isValidSchedule);
        this.saveToLocal(valid);
        return valid;
    }
}

