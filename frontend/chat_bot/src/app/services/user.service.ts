import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, tap, throwError, of } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class UserService {

    // private apiUrl = environment.user_apiBaseUrl + '/api/users';
    private apiUrl = environment.user_apiBaseUrl;
    private storageKey = 'users_cache';

    constructor(private http: HttpClient, private toast: ToastService) { }

    /* =====================================================
       ERROR HANDLER
    ===================================================== */
    private handleError(error: any) {
        console.error('UserService ERROR:', error);

        let message = 'Something went wrong';

        if (error?.status === 0) message = 'Server not reachable';
        else if (error?.status === 401) message = 'Session expired';
        else if (error?.error?.message) message = error.error.message;

        return throwError(() => new Error(message));
    }

    /* =====================================================
       LOCAL CACHE HELPERS
    ===================================================== */
    private safeParse(json: string | null) {
        try { return json ? JSON.parse(json) : []; }
        catch { return []; }
    }

    private setCache(users: any[]) {
        localStorage.setItem(this.storageKey, JSON.stringify(users));
    }

    private getCache(): any[] {
        return this.safeParse(localStorage.getItem(this.storageKey));
    }

    /* =====================================================
       GET USERS (SMART CACHE)
    ===================================================== */
    getUsers(page = 0, size = 10, search = '') {

        return this.http.get(`${this.apiUrl}`, {
            params: {
                page,
                size,
                search
            }
        });

    }

    /* =====================================================
       BACKGROUND REFRESH (silent API call)
    ===================================================== */
    private refreshUsersInBackground() {
        this.http.get<any[]>(this.apiUrl).subscribe({
            next: users => {
                this.setCache(users);
                console.log('🔄 Users cache refreshed');
            },
            error: () => console.warn('Background refresh failed')
        });
    }

    /* =====================================================
       ADD USER
    ===================================================== */
    addUser(user: any): Observable<any> {

        return this.http.post<any>(this.apiUrl, user).pipe(

            tap((createdUser: any) => {

                const users = this.getCache() || [];
                users.push(createdUser);
                this.setCache(users);

                this.toast.success('✅ User added successfully');

            }),

            catchError(err => {
                this.toast.error(err.message || '❌ Failed to add user');
                return this.handleError(err);
            })

        );
    }


    /* =====================================================
       UPDATE USER
    ===================================================== */
    updateUser(user: any): Observable<any> {

        const payload = {
            name: user.name,
            phone: user.phone,
            specialization: user.specialization,
            role: user.role
        };

        return this.http.put<any>(`${this.apiUrl}/${user.usersId}`, payload).pipe(

            tap(() => {

                const users = this.getCache() || [];
                const index = users.findIndex(u => u.usersId === user.usersId);

                if (index !== -1) {
                    users[index] = user;
                    this.setCache(users);
                }

                this.toast.success('✅ User updated successfully');

            }),

            catchError(err => {
                this.toast.error(err.message || '❌ Failed to update user');
                return this.handleError(err);
            })

        );
    }

    /* =====================================================
       DELETE USER (SOFT DELETE)
    ===================================================== */
    // deleteUser(usersId: string): Observable<any> {
    //     return this.http.delete(`${this.apiUrl}/${usersId}`).pipe(
    //         tap(() => {
    //             const users = this.getCache()
    //                 .filter(u => u.usersId !== usersId);
    //             this.setCache(users);
    //         }),
    //         catchError(err => this.handleError(err))
    //     );
    // }
    deleteUser(usersId: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${usersId}`).pipe(

            tap((response: any) => {

                // ✅ optional validation (if backend returns confirmation)
                if (response === null) {
                    this.toast.error('❌ Invalid delete response');
                    throw new Error('Invalid delete response');
                }

                // ✅ update local cache safely
                const users = this.getCache() || [];
                const updatedUsers = users.filter(u => u.usersId !== usersId);
                this.setCache(updatedUsers);

                // ✅ success toast
                this.toast.success('🗑️ User deleted successfully');
            }),

            catchError(err => {
                this.toast.error(err.message || '❌ Failed to delete user');
                return this.handleError(err);
            })
        );
    }

}
