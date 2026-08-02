import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {

  private readonly apiUrl = `${environment.apiGatewayUrl}/admin`;

  constructor(private http: HttpClient) { }

  private handleError(err: any) {
    console.error('AdminService ERROR', err);
    let msg = 'Something went wrong';
    if (err?.status === 0) msg = 'Server not reachable';
    else if (err?.status === 401) msg = 'Session expired';
    else if (err?.error?.message) msg = err.error.message;
    return throwError(() => new Error(msg));
  }

  getOverview(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metrics/overview`).pipe(
      catchError(err => this.handleError(err))
    );
  }

  getApprovals(page = 0, size = 20): Observable<any> {
    return this.http.get(`${this.apiUrl}/approvals/queue?page=${page}&size=${size}`).pipe(
      catchError(err => this.handleError(err))
    );
  }

  performAction(clinicId: string, action: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/clinics/${clinicId}/action`, { action, ...payload }).pipe(
      catchError(err => this.handleError(err))
    );
  }

}
