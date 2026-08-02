import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AdminService {

  private readonly apiUrl = `${environment.apiGatewayUrl}/admin`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private handleError(err: any) {
    console.error('AdminService ERROR', err);
    let msg = 'Something went wrong';
    if (err?.status === 0) msg = 'Server not reachable';
    else if (err?.status === 401) msg = 'Session expired';
    else if (err?.error?.message) msg = err.error.message;
    return throwError(() => new Error(msg));
  }

  getOverview(): Observable<any> {
    const url = `${this.apiUrl}/metrics/overview`;
    console.debug('[AdminService] GET', url, 'hasToken=', !!this.authService.getToken());
    return this.http.get(url).pipe(
      catchError(err => this.handleError(err))
    );
  }

  getApprovals(page = 0, size = 20): Observable<any> {
    const url = `${this.apiUrl}/approvals/queue?page=${page}&size=${size}`;
    console.debug('[AdminService] GET', url, 'hasToken=', !!this.authService.getToken());
    return this.http.get(url).pipe(
      catchError(err => this.handleError(err))
    );
  }

  performAction(clinicId: string, action: string, payload: any): Observable<any> {
    const url = `${this.apiUrl}/clinics/${clinicId}/action`;
    console.debug('[AdminService] POST', url, 'action=', action, 'hasToken=', !!this.authService.getToken());
    return this.http.post(url, { action, ...payload }).pipe(
      catchError(err => this.handleError(err))
    );
  }

}
