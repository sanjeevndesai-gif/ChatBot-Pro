import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-editprofile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editprofile.html',
  styleUrls: ['./editprofile.scss']
})
export class EditProfile implements OnInit {
  mustChangePassword = false;

  user: any = {};
  apiUrl = environment.auth_apiBaseUrl;
  // Using global toast for messages; local saveError/saveSuccess removed
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
    private toastService: ToastService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check if mustChangePassword flag is set
    this.mustChangePassword = localStorage.getItem('mustChangePassword') === 'true';
    const storedUser = this.authService.getCurrentUser();
    if (!storedUser) {
      this.authService.logout();
      return;
    }

    // Normalize field names: registration stores phone_number / orgname
    // Derive country from stored fields. Registration sometimes stores country_code or phone pattern.
    const derivedCountry = (storedUser as any).country
      || (storedUser as any).country_code && ((storedUser as any).country_code.indexOf('+91') === 0 ? 'India' :
          (storedUser as any).country_code.indexOf('+1') === 0 ? 'USA' :
          (storedUser as any).country_code.indexOf('+44') === 0 ? 'UK' :
          (storedUser as any).country_code.indexOf('+61') === 0 ? 'Australia' : '')
      || ((storedUser as any).phone_number || '').toString().startsWith('+91') ? 'India' : '';

    this.user = {
      ...storedUser,
      phone: (storedUser as any).phone || (storedUser as any).phone_number || '',
      orgname: (storedUser as any).orgname || (storedUser as any).orgId || '',
      country: derivedCountry || '',
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
      const msg = 'Please select a valid image file.';
      this.toastService.error(msg);
      return;
    }

    // Prevent very large images from being stored in localStorage as Base64
    const maxBytes = 1.5 * 1024 * 1024; // 1.5 MB
    if (file.size > maxBytes) {
      const msg = 'Image too large. Please choose an image smaller than 1.5 MB.';
      this.toastService.error(msg);
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
      const msg = 'Unable to save: user session is missing ID. Please log out and log in again.';
      this.toastService.error(msg);
      return;
    }

    // Clear previous messages handled by toast; no local inline state.

    // Build payload and include photo (Base64) if present so backend can persist it to DB
    const payload: any = {
      fullname: this.user.fullname,
      email: this.user.email,
      phone: this.user.phone,
      address: this.user.address,
      country: this.user.country,
      language: this.user.language
    };

    if (this.photoPreview) {
      payload['profilePhoto'] = this.photoPreview;
    }

    this.http.put(`${this.apiUrl}/profile/${mongoId}`, payload).subscribe({
      next: () => {
        const updatedUser = {
          ...this.authService.getCurrentUser(),
          ...payload,
          phone_number: this.user.phone  // keep registration field in sync
        };
        // store updated user including profilePhoto so UI can read from storage
        this.storage.setItem('auth_user', updatedUser);
        this.toastService.success('Profile saved successfully!');
        setTimeout(() => this.router.navigate(['/app/profile']), 1000);
      },
      error: (err) => {
        console.error('Profile update failed', err);
        const msg = err?.error?.message || 'Failed to save profile. Please try again.';
        this.toastService.error(msg);
      }
    });
  }

  cancel() {
    this.router.navigate(['/app/profile']);
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
        // Remove mustChangePassword flag after successful change
        localStorage.removeItem('mustChangePassword');
        this.mustChangePassword = false;
      },
      error: (err) => {
        this.pwdError = err?.error?.message || 'Failed to change password. Please try again.';
      }
    });
  }
}
