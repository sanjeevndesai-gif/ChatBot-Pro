import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from '../core/services/storage.service';
import { AuthUser, AuthResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly baseUrl = environment.auth_apiBaseUrl;
  private readonly storageKey = 'auth_user';
  private readonly accessTokenKey = 'accessToken';
  private readonly refreshTokenKey = 'refreshToken';

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly storage: StorageService
  ) { }

  private handleError(error: any): Observable<never> {
    let message = 'Something went wrong. Please try again.';

    if (error?.error?.message) {
      message = error.error.message;
    } else if (error?.status === 0) {
      message = 'Cannot connect to server';
    } else if (error?.status === 401) {
      message = 'Session expired. Please login again';
      this.logout();
    }

    return throwError(() => new Error(message));
  }

  register(formValue: Record<string, string>): Observable<unknown> {
    const payload = {
      email: formValue['email'],
      password: formValue['password'],
      fullname: formValue['fullname'],
      country: formValue['country'],
      country_code: formValue['country_code'],
      phone_number: formValue['phone_number'],
      address: formValue['address'],
      orgname: formValue['orgname'],
      occupation: formValue['occupation']
    };

    return this.http.post(`${this.baseUrl}/register`, payload).pipe(
      catchError(err => this.handleError(err))
    );
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap((res) => {
        const accessToken = (res as any)?.accessToken ?? (res as any)?.token;
        const refreshToken = (res as any)?.refreshToken ?? accessToken;

        if (accessToken) {
          this.storage.setString(this.accessTokenKey, accessToken);
        }
        if (refreshToken) {
          this.storage.setString(this.refreshTokenKey, refreshToken);
        }
        if ((res as any)?.user) {
          const userData = {
            ...(res as any).user,
            mongoId: (res as any).userId
          };
          this.storage.setItem(this.storageKey, userData);
        }
      }),
      catchError(err => this.handleError(err))
    );
  }

  getToken(): string | null {
    return this.storage.getString(this.accessTokenKey);
  }

  getUserId(): string | null {
    return this.storage.getItem<AuthUser>(this.storageKey)?.userId ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.storage.getString(this.accessTokenKey);
  }

  getCurrentUser(): AuthUser | null {
    const user = this.storage.getItem<AuthUser>(this.storageKey);

    if (user) return user;

    if (!environment.production) {
      return {
        userId: 'DEV123',
        fullname: 'Dev User',
        email: 'dev@example.com',
        phone: '9999999999',
        occupation: 'Developer',
        address: 'India'
      };
    }

    return null;
  }

  logout(): void {
    this.storage.removeItem(this.accessTokenKey);
    this.storage.removeItem(this.refreshTokenKey);
    this.storage.removeItem(this.storageKey);
    this.router.navigate(['/login']);
  }

}

