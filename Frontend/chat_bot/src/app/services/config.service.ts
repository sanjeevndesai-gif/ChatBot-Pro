import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfigService {

    private config: any = null;

    constructor(private http: HttpClient) { }

    async loadConfig() {
        this.config = await firstValueFrom(
            this.http.get('/assets/config.json')
        );
    }

    get apiBaseUrl(): string {
        return this.config.apiBaseUrl;
    }

    get i18nLanguagesUrl(): string {
        return this.apiBaseUrl + this.config.i18n.languages;
    }

    get i18nTranslationsUrl(): string {
        return this.apiBaseUrl + this.config.i18n.translations;
    }
}
