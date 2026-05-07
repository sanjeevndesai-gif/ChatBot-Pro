import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SchedulerService {

    private API = "http://localhost:9091/api/schedulers";

    constructor(private http: HttpClient) { }

    saveScheduler(data: any): Observable<any> {
        return this.http.post(this.API, data);
    }

    getSchedulers(): Observable<any[]> {
        return this.http.get<any[]>(this.API);
    }

    deleteScheduler(id: string) {
        return this.http.delete(`${this.API}/${id}`);
    }
}