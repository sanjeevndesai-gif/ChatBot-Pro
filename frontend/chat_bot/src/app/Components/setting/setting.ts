import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

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

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly toast: ToastService
  ) {}

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
    // Toggle local UI state only; do not call backend until user clicks Save
    (this as any)[prop] = !(this as any)[prop];
  }

  // Called by Save button - performs backend save
  onSave(): void {
    if (!this.canEdit) {
      console.warn('Save blocked: Basic plan users cannot save settings');
      return;
    }
    this.saveSettings();
  }

  // Revert UI state to stored settings
  onCancel(): void {
    const user = this.authService.getCurrentUser();
    const settings = (user as any)?.settings || {};
    this.onDemand = settings.onDemand ?? this.onDemand;
    this.scheduledReport = settings.scheduledReport ?? this.scheduledReport;
    this.feedbackMessage = settings.feedbackMessage ?? this.feedbackMessage;
    this.reminderMessages = settings.reminderMessages ?? this.reminderMessages;
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
        // After successful save, re-fetch full user document from server and update local cache
        const userId = this.authService.getUserId();
        if (userId) {
          this.http.get<any>(`${this.apiBase}/find/${userId}`).subscribe({
            next: (freshUser) => {
              // Normalize similar to AuthService.login behaviour
              const resolvedUserId = freshUser.userId || freshUser.mongoId || freshUser.id || freshUser._id || userId;
              const normalized = {
                ...freshUser,
                userId: resolvedUserId,
                mongoId: freshUser.mongoId || freshUser.userId || freshUser.id || freshUser._id || undefined
              };
              this.authService.setCurrentUser(normalized as any);
              this.toast.success('Your settings have been saved successfully');
            },
            error: (err) => {
              console.warn('Saved but failed to refresh user cache', err);
              this.toast.success('Your settings have been saved successfully');
            }
          });
        } else {
          this.toast.success('Your settings have been saved successfully');
        }
      },
      error: (err) => {
        console.error('Failed to save settings', err);
        this.toast.error('Failed to save settings');
        // keep UI state unchanged; user can retry
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
