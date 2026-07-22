import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {

    const authService = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    const token = authService.getToken();

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {

            if (error.status === 401) {
                authService.logout();

                if (router.url !== '/login') {
                    router.navigate(['/login']);
                }
            } else if (error.status === 403) {
                // If the backend reports account inactive, don't log the user out.
                const msg = error.error && (error.error.message || error.error.msg) ? (error.error.message || error.error.msg) : '';
                if (msg.toLowerCase().includes('inactive') || msg.toLowerCase().includes('renew')) {
                    toast.warning(msg || 'Account inactive - please renew your plan');
                    // navigate to billing page so user can renew
                    if (router.url !== '/app/plan-billing') {
                        router.navigate(['/app/plan-billing']);
                    }
                    // Do not logout the user; allow billing endpoints to work.
                    return throwError(() => error);
                }

                // Fallback: treat other 403 as an auth issue
                authService.logout();
                if (router.url !== '/login') {
                    router.navigate(['/login']);
                }
            }

            return throwError(() => error);
        })
    );
};