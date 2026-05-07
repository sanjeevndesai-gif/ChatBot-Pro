import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
    if (!environment.useMockApi) {
        return next(req);
    }

    console.warn('MOCK ACTIVE →', req.url);

    if (req.url.includes('/api/schedules')) {
        return of(new HttpResponse({
            status: 200,
            body: [
                { id: '1', name: 'Albert', date: '19/12/2025', slot: '10:00 AM - 11:00 AM', status: 'Active' },
                { id: '2', name: 'Sarah', date: '18/12/2025', slot: '12:00 PM - 01:00 PM', status: 'Completed' },
                { id: '3', name: 'Michael', date: '17/12/2025', slot: '02:00 PM - 03:00 PM', status: 'Pending' }
            ]
        })).pipe(delay(500));
    }

    if (req.url.includes('/api/logs')) {
        return of(new HttpResponse({ status: 200 })).pipe(delay(200));
    }

    if (req.url.includes('/api/i18n')) {
        return of(new HttpResponse({
            status: 200,
            body: { en: { title: 'Schedule Report' } }
        }));
    }

    return next(req);
};

