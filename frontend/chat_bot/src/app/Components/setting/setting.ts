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

  constructor(private readonly http: HttpClient, private readonly authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const settings = (user as any)?.settings || {};
    this.onDemand = settings.onDemand ?? this.onDemand;
    this.scheduledReport = settings.scheduledReport ?? this.scheduledReport;
    this.feedbackMessage = settings.feedbackMessage ?? this.feedbackMessage;
    this.reminderMessages = settings.reminderMessages ?? this.reminderMessages;
  }

  toggle(prop: string) {
    (this as any)[prop] = !(this as any)[prop];
    this.saveSettings();
  }

  private saveSettings(): void {
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

}
