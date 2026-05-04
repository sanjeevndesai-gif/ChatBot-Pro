import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {

    const authService = inject(AuthService);
    const router = inject(Router);

    /* =====================================================
       ATTACH TOKEN
    ===================================================== */

    const token = localStorage.getItem('accessToken');

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    /* =====================================================
       GLOBAL ERROR HANDLER
    ===================================================== */

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {

            console.error('HTTP ERROR:', error);

            /* =====================================
               TOKEN EXPIRED / UNAUTHORIZED
            ===================================== */

            if (error.status === 401 || error.status === 403) {

                console.warn('Session expired → redirecting to login');

                // clear session
                authService.logout();

                // prevent multiple redirects
                if (router.url !== '/login') {
                    router.navigate(['/login']);
                }
            }

            /* =====================================
               BACKEND NOT REACHABLE
            ===================================== */

            if (error.status === 0) {
                console.warn('Backend server not reachable');
            }

            return throwError(() => error);
        })
    );
};