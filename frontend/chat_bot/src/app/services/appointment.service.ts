import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AppointmentService {

    private readonly apiUrl = environment.appointment_apiBaseUrl;

    constructor(private http: HttpClient) { }

    private handleError(error: any) {
        console.error('AppointmentService ERROR:', error);
        return throwError(() => error);
    }

    createAppointment(data: any): Observable<any> {
        return this.http.post(this.apiUrl, data).pipe(
            catchError(err => this.handleError(err))
        );
    }

    getAppointments(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl).pipe(
            catchError(err => this.handleError(err))
        );
    }

    deleteAppointment(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`).pipe(
            catchError(err => this.handleError(err))
        );
    }
}