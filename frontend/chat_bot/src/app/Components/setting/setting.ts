import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setting.html',
  styleUrls: ['./setting.scss'],
})
export class Setting implements OnInit {
  // Report settings
  onDemand = true;
  scheduledReport = false;

  // Message settings
  feedbackMessage = false;
  reminderMessages = false;

  private readonly apiBase = environment.auth_apiBaseUrl;

  canEdit = false; // only true for paid plans

  constructor(private readonly http: HttpClient, private readonly authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const settings = (user as any)?.settings || {};
    this.onDemand = settings.onDemand ?? this.onDemand;
    this.scheduledReport = settings.scheduledReport ?? this.scheduledReport;
    this.feedbackMessage = settings.feedbackMessage ?? this.feedbackMessage;
    this.reminderMessages = settings.reminderMessages ?? this.reminderMessages;

    // Determine whether the current user can edit settings
    this.loadBillingAndApplyPermissions();
  }

  toggle(prop: string) {
    if (!this.canEdit) {
      console.warn('Settings editing disabled for Basic plan users');
      return;
    }
    (this as any)[prop] = !(this as any)[prop];
    this.saveSettings();
  }

  private saveSettings(): void {
    if (!this.canEdit) return;
    const payload = {
      onDemand: this.onDemand,
      scheduledReport: this.scheduledReport,
      feedbackMessage: this.feedbackMessage,
      reminderMessages: this.reminderMessages
    };

    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    this.http.put<any>(`${this.apiBase}/profile/settings`, payload, { headers }).subscribe({
      next: () => {
        // optionally update stored user settings
        const current = this.authService.getCurrentUser();
        if (current) {
          (current as any).settings = payload;
        }
      },
      error: (err) => {
        console.error('Failed to save settings', err);
        // revert change on error? For now, keep UI state and show console error.
      }
    });
  }

  private loadBillingAndApplyPermissions(): void {
    const userId = this.authService.getUserId() || (this.authService.getCurrentUser() as any)?.userId;
    if (!userId) {
      this.canEdit = false;
      return;
    }

    this.http.get<any>(`${this.apiBase}/billing/${userId}`).subscribe({
      next: (res) => {
        const planName = (res?.planName || '').toString().toUpperCase();
        const planCode = (res?.planTemplate?.planCode || res?.planCode || '').toString().toUpperCase();
        // Allow only STANDARD, PREMIUM, PROPLUS (and any non-BASIC)
        if (planName === 'BASIC' || planCode === 'BASIC' || !planName) {
          this.canEdit = false;
        } else {
          this.canEdit = true;
        }
      },
      error: (err) => {
        console.warn('Could not load billing info, disabling settings edit', err);
        this.canEdit = false;
      }
    });
  }

}
