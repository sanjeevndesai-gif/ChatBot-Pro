import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class UserService {

    private readonly apiUrl = environment.user_apiBaseUrl;

    constructor(private http: HttpClient, private toast: ToastService) { }

    private handleError(error: any) {
        console.error('UserService ERROR:', error);

        let message = 'Something went wrong';

        if (error?.status === 0) message = 'Server not reachable';
        else if (error?.status === 401) message = 'Session expired';
        else if (error?.error?.message) message = error.error.message;

        return throwError(() => new Error(message));
    }

    getUsers(page = 0, size = 10, search = ''): Observable<any> {
        const params = new HttpParams()
            .set('page', page)
            .set('size', size)
            .set('search', search);

        return this.http.get(this.apiUrl, { params }).pipe(
            catchError(err => this.handleError(err))
        );
    }

    addUser(user: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, user).pipe(
            tap(() => this.toast.success('User added successfully')),
            catchError(err => {
                this.toast.error(err.message || 'Failed to add user');
                return this.handleError(err);
            })
        );
    }

    updateUser(user: any): Observable<any> {
        const payload = {
            name: user.name,
            phone: user.phone,
            specialization: user.specialization,
            role: user.role
        };

        return this.http.put<any>(`${this.apiUrl}/${user.usersId}`, payload).pipe(
            tap(() => this.toast.success('User updated successfully')),
            catchError(err => {
                this.toast.error(err.message || 'Failed to update user');
                return this.handleError(err);
            })
        );
    }

    deleteUser(usersId: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${usersId}`).pipe(
            tap(() => this.toast.success('User deleted successfully')),
            catchError(err => {
                this.toast.error(err.message || 'Failed to delete user');
                return this.handleError(err);
            })
        );
    }

}
