import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SchedulerService {

    private readonly apiUrl = environment.scheduler_apiBaseUrl;

    constructor(private http: HttpClient) { }

    private handleError(error: any) {
        console.error('SchedulerService ERROR:', error);
        return throwError(() => error);
    }

    saveScheduler(data: any): Observable<any> {
        return this.http.post(this.apiUrl, data).pipe(
            catchError(err => this.handleError(err))
        );
    }

    updateScheduler(id: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, data).pipe(
            catchError(err => this.handleError(err))
        );
    }

    getSchedulers(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl).pipe(
            catchError(err => this.handleError(err))
        );
    }

    deleteScheduler(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`).pipe(
            catchError(err => this.handleError(err))
        );
    }

    deleteSlot(
        schedulerId: string,
        resourceId: string,
        slotId: string,
        date?: string
    ): Observable<any> {

        let url = `${this.apiUrl}/${schedulerId}/resource/${resourceId}/slot/${slotId}`;
        if (date) {
            url += `?date=${encodeURIComponent(date)}`;
        }

        return this.http.delete(url).pipe(
            catchError(err => this.handleError(err))
        );
    }

    deleteResourceSchedule(
        schedulerId: string,
        resourceId: string
    ): Observable<any> {
        return this.http.delete(
            `${this.apiUrl}/${schedulerId}/resource/${resourceId}`
        ).pipe(catchError(err => this.handleError(err))
        );
    }

    deleteMultipleSlots(

        slots: {

            schedulerId: string;

            resourceId: string;

            slotId: string;

        }[]

    ): Observable<any> {

        return this.http.post(

            `${this.apiUrl}/delete-multiple-slots`,

            { slots }

        ).pipe(

            catchError(err =>
                this.handleError(err)
            )
        );
    }
}