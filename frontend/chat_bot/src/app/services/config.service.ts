import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfigService {

    private config: any = null;

    constructor(private http: HttpClient) { }

    async loadConfig() {
        try {
            // ✅ Primary source: assets/config.json
            this.config = await firstValueFrom(
                this.http.get('/assets/config.json')
            );
        } catch (err) {
            console.error('Failed to load config.json, using environment fallback', err);
            // ✅ Fallback to environment (prevents crash)
            this.config = {
                apiBaseUrl: environment.auth_apiBaseUrl,
                // i18n: {
                //     languages: '/api/i18n/languages',
                //     translations: '/api/i18n/translations'
                // }
            };
        }
    }

    // ✅ Base API URL (config.json → fallback to environment)
    get apiBaseUrl(): string {
        return this.config?.apiBaseUrl || environment.auth_apiBaseUrl;
    }

    // // ✅ i18n URLs (from config.json → fallback)
    // get i18nLanguagesUrl(): string {
    //     return this.apiBaseUrl + (this.config?.i18n?.languages || '/api/i18n/languages');
    // }

    // get i18nTranslationsUrl(): string {
    //     return this.apiBaseUrl + (this.config?.i18n?.translations || '/api/i18n/translations');
    // }
}
