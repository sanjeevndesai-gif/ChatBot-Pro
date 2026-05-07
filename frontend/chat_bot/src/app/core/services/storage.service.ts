import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {

    setItem<T>(key: string, value: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Storage quota exceeded or unavailable
        }
    }

    getItem<T>(key: string): T | null {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    }

    getString(key: string): string | null {
        return localStorage.getItem(key);
    }

    setString(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Storage quota exceeded or unavailable
        }
    }

    removeItem(key: string): void {
        localStorage.removeItem(key);
    }

    clear(): void {
        localStorage.clear();
    }
}
