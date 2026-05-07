import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-editprofile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editprofile.html',
  styleUrls: ['./editprofile.scss']
})
export class EditProfile implements OnInit {

  user: any = {};
  apiUrl = environment.auth_apiBaseUrl;
  saveError = '';
  saveSuccess = '';
  photoPreview: string | null = null;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwdError = '';
  pwdSuccess = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private storage: StorageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const storedUser = this.authService.getCurrentUser();
    if (!storedUser) {
      this.authService.logout();
      return;
    }

    // Normalize field names: registration stores phone_number / orgname
    this.user = {
      ...storedUser,
      phone: (storedUser as any).phone || (storedUser as any).phone_number || '',
      orgname: (storedUser as any).orgname || (storedUser as any).orgId || '',
      country: (storedUser as any).country || '',
      language: (storedUser as any).language || 'English',
      address: (storedUser as any).address || ''
    };

    // Restore saved photo if any
    const savedPhoto = localStorage.getItem('profile_photo_' + this.user.mongoId);
    if (savedPhoto) {
      this.photoPreview = savedPhoto;
    }
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.saveError = 'Please select a valid image file.';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  resetPhoto(): void {
    this.photoPreview = null;
    if (this.user.mongoId) {
      localStorage.removeItem('profile_photo_' + this.user.mongoId);
    }
  }

  saveProfile() {
    const mongoId = this.user.mongoId;
    if (!mongoId) {
      this.saveError = 'Unable to save: user session is missing ID. Please log out and log in again.';
      return;
    }

    this.saveError = '';
    this.saveSuccess = '';

    // Save photo to localStorage (no backend blob storage yet)
    if (this.photoPreview) {
      localStorage.setItem('profile_photo_' + mongoId, this.photoPreview);
    }

    const payload = {
      fullname: this.user.fullname,
      email: this.user.email,
      phone: this.user.phone,
      address: this.user.address,
      country: this.user.country,
      language: this.user.language
    };

    this.http.put(`${this.apiUrl}/profile/${mongoId}`, payload).subscribe({
      next: () => {
        const updatedUser = {
          ...this.authService.getCurrentUser(),
          ...payload,
          phone_number: this.user.phone  // keep registration field in sync
        };
        this.storage.setItem('auth_user', updatedUser);
        this.saveSuccess = 'Profile saved successfully!';
        setTimeout(() => this.router.navigate(['/profile']), 1000);
      },
      error: (err) => {
        console.error('Profile update failed', err);
        this.saveError = err?.error?.message || 'Failed to save profile. Please try again.';
      }
    });
  }

  cancel() {
    this.router.navigate(['/profile']);
  }

  changePassword() {
    this.pwdError = '';
    this.pwdSuccess = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.pwdError = 'All password fields are required.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.pwdError = 'New password must be at least 8 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwdError = 'New password and confirmation do not match.';
      return;
    }

    const mongoId = this.user.mongoId;
    if (!mongoId) {
      this.pwdError = 'User session missing ID. Please log out and log in again.';
      return;
    }

    this.http.put(`${this.apiUrl}/change-password/${mongoId}`, {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.pwdSuccess = 'Password changed successfully!';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        this.pwdError = err?.error?.message || 'Failed to change password. Please try again.';
      }
    });
  }
}
