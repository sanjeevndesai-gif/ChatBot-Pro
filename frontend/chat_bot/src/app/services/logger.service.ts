import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggerService {

    constructor(
        private http: HttpClient,
        private config: ConfigService
    ) { }

    info(msg: string, data?: any) {
        console.info('[INFO]', msg, data || '');
        this.sendToServer('INFO', msg, data);
    }

    warn(msg: string, data?: any) {
        console.warn('[WARN]', msg, data || '');
        this.sendToServer('WARN', msg, data);
    }

    error(msg: string, data?: any) {
        console.error('[ERROR]', msg, data || '');
        this.sendToServer('ERROR', msg, data);
    }

    private sendToServer(level: string, msg: string, data?: any) {
        if (environment.useMockApi) {
            return; // ✅ STOP hitting real backend in dev
        }

        const payload = { level, msg, data, time: new Date() };
        this.http.post(`${this.config.apiBaseUrl}/api/logs`, payload).subscribe({
            error: () => console.warn('Logging API failed')
        });
    }

}
