import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { firstValueFrom, timer } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BillingStatusService {

  // true when account is deactivated (user should renew)
  public readonly isDeactivated = signal(false);

  private readonly baseUrl = environment.auth_apiBaseUrl;

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {
  }

  async refresh(): Promise<void> {
    const userId = this.auth.getUserId();
    if (!userId) {
      this.isDeactivated.set(false);
      return;
    }

    try {
      const url = `${this.baseUrl}/billing/${encodeURIComponent(userId)}`;
      const resp: any = await firstValueFrom(this.http.get(url));
      const status = resp?.status || resp?.billing?.status || 'active';
      this.isDeactivated.set(status === 'deactivated');
    } catch (e) {
      // On error, don't block the UI; keep previous state
      console.warn('BillingStatusService.refresh failed', e);
    }
  }

  /** Start periodic refresh every `ms` milliseconds (no-op if already started). */
  startPolling(ms = 5 * 60 * 1000) {
    // simple polling using rxjs timer
    timer(0, ms).subscribe(() => this.refresh());
  }
}
