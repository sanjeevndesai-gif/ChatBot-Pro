import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BillingInfo {
  planName: string;
  planPrice: number;
  currency: string;
  activeUntil: number;   // epoch ms
  daysUsed: number;
  daysTotal: number;
  status: 'active' | 'deactivated';
  nearExpiry: boolean;
  maxDoctors: number;    // -1 = unlimited; comes from backend plan definition
}

@Injectable({ providedIn: 'root' })
export class BillingService {

  private readonly base = environment.auth_apiBaseUrl;

  constructor(private http: HttpClient) {}

  getBilling(mongoId: string): Observable<BillingInfo> {
    return this.http.get<BillingInfo>(`${this.base}/billing/${mongoId}`);
  }

  upgradePlan(mongoId: string, planName: string, planPrice: number): Observable<void> {
    return this.http.put<void>(`${this.base}/billing/${mongoId}/upgrade`, { planName, planPrice });
  }

  deactivateUser(mongoId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/billing/${mongoId}/deactivate`, {});
  }
}
