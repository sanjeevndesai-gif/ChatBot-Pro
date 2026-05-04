import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AppointmentService {

    private API = "http://localhost:9091/api/appointments";

    constructor(private http: HttpClient) { }

    createAppointment(data: any): Observable<any> {
        return this.http.post(this.API, data);
    }

    getAppointments(): Observable<any[]> {
        return this.http.get<any[]>(this.API);
    }

    deleteAppointment(id: string) {
        return this.http.delete(`${this.API}/${id}`);
    }
}