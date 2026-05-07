import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
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

  // password fields (optional – backend not wired yet)
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const storedUser = this.authService.getCurrentUser();
    if (!storedUser) {
      this.authService.logout();
      return;
    }

    this.user = { ...storedUser };
  }

  saveProfile() {
    const payload = {
      fullname: this.user.fullname,
      email: this.user.email,
      phone: this.user.phone,
      address: this.user.address,
      country: this.user.country,
      language: this.user.language
    };

    this.http.put(
      `${this.apiUrl}/auth-service?id=${this.user.userId}&orgId=${this.user.orgId}`,
      payload
    ).subscribe(() => {

      const updatedUser = {
        ...this.authService.getCurrentUser(),
        ...payload
      };

      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      this.router.navigate(['/profile']);
    });
  }

  cancel() {
    this.router.navigate(['/profile']);
  }
}
