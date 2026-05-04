import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
    text: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'dark';
}

@Injectable({ providedIn: 'root' })
export class ToastService {

    private toastSubject = new Subject<ToastMessage>();
    toast$ = this.toastSubject.asObservable();

    success(msg: string) {
        this.toastSubject.next({ text: msg, type: 'success' });
    }

    error(msg: string) {
        this.toastSubject.next({ text: msg, type: 'error' });
    }

    info(msg: string) {
        this.toastSubject.next({ text: msg, type: 'info' });
    }

    warning(msg: string) {
        this.toastSubject.next({ text: msg, type: 'warning' });
    }

    dark(msg: string) {
        this.toastSubject.next({ text: msg, type: 'dark' });
    }
}
