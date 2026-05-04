import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl = environment.auth_apiBaseUrl;
  private storageKey = 'auth_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  /* =====================================================
     COMMON ERROR HANDLER
  ===================================================== */
  private handleError(error: any) {
    console.error('AuthService ERROR:', error);

    let message = 'Something went wrong. Please try again.';

    if (error?.error?.message) {
      message = error.error.message;
    } else if (error?.status === 0) {
      message = 'Cannot connect to server';
    } else if (error?.status === 401) {
      message = 'Session expired. Please login again';
      this.logout(); // auto logout if unauthorized
    }

    return throwError(() => new Error(message));
  }

  /* =====================================================
     RESPONSE VALIDATION
  ===================================================== */
  private validateAuthResponse(res: any) {

    if (!res) throw new Error('Empty response from server');
    if (!res.token) throw new Error('Token missing in response');
    if (!res.user) throw new Error('User data missing in response');

    return res;
  }

  /* =====================================================
     REGISTER
  ===================================================== */
  // register(payload: any): Observable<any> {
  //   return this.http.post(`${this.baseUrl}/auth-service`, payload)
  //     .pipe(catchError(err => this.handleError(err)));
  // }

  register(formValue: any) {

    const payload = {
      email: formValue.email,
      password: formValue.password,

      // everything else will go to payload automatically
      fullname: formValue.fullname,
      country: formValue.country,
      country_code: formValue.country_code,
      phone: formValue.phone_number,
      address: formValue.address,
      orgname: formValue.orgname,
      occupation: formValue.occupation
    };

    return this.http.post(`${environment.auth_apiBaseUrl}/register`, payload);
  }

  /* =====================================================
     LOGIN
  ===================================================== */
  // login(payload: any): Observable<any> {
  //   return this.http.post(`${this.baseUrl}/auth-service/login`, payload)
  //     .pipe(
  //       map(res => this.validateAuthResponse(res)),
  //       tap(res => this.storeAuthUser(res)),
  //       catchError(err => this.handleError(err))
  //     );
  // }

  login(credentials: any) {
    return this.http.post(`${environment.auth_apiBaseUrl}/login`, credentials)
      .pipe(
        tap((res: any) => {
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken);
        })
      );
  }

  /* =====================================================
     STORE AUTH USER SAFELY
  ===================================================== */
  private storeAuthUser(res: any) {
    try {
      const authUser = {
        token: res.token ?? '',
        userId: res.user?.userId ?? '',
        fullname: res.user?.fullname ?? '',
        email: res.user?.email ?? '',
        phone: res.user?.phone_number ?? '',
        occupation: res.user?.occupation ?? '',
        orgId: res.user?.orgId ?? '',
        address: res.user?.address ?? ''
      };

      localStorage.setItem(this.storageKey, JSON.stringify(authUser));
      console.log('Auth user stored successfully');
    } catch (e) {
      console.error('Failed to store auth user', e);
    }
  }

  /* =====================================================
     SAFE GETTERS
  ===================================================== */
  private safeParse(json: string | null) {
    try {
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  // getToken(): string | null {
  //   return this.safeParse(localStorage.getItem(this.storageKey))?.token ?? null;
  // }

  // getToken(): string | null {
  //   const token = this.safeParse(localStorage.getItem(this.storageKey))?.token;

  //   if (token) return token;

  //   // 🔥 DEV AUTO LOGIN (remove in production)
  //   if (!environment.production) {
  //     console.warn('⚠️ Dev token injected');
  //     return 'dev-token-123';
  //   }

  //   return null;
  // }
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getUserId(): string | null {
    return this.safeParse(localStorage.getItem(this.storageKey))?.userId ?? null;
  }

  // isLoggedIn(): boolean {
  //   return !!this.getToken();
  // }
  isLoggedIn(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getCurrentUser() {
    const user = this.safeParse(localStorage.getItem(this.storageKey));

    if (user) return user;

    // dev fallback
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

  /* =====================================================
     LOGOUT
  ===================================================== */
  logout() {

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem(this.storageKey);

    this.router.navigate(['/login']);

  }

}
