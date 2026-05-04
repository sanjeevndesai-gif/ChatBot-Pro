// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { BehaviorSubject, tap } from 'rxjs';
// import { ConfigService } from './config.service';

// @Injectable({ providedIn: 'root' })
// export class I18nService {

//     // Observables for language list & translations
//     languages$ = new BehaviorSubject<any[]>([]);
//     translations$ = new BehaviorSubject<{ [key: string]: string }>({});
//     currentLang$ = new BehaviorSubject<string>('en');

//     constructor(
//         private http: HttpClient,
//         private config: ConfigService
//     ) {
//         const saved = localStorage.getItem('lang');
//         if (saved) this.currentLang$.next(saved);
//     }

//     // 🚀 Fetch available languages from API
//     loadLanguages() {
//         return this.http
//             .get<any[]>(this.config.i18nLanguagesUrl)
//             .pipe(tap(langs => {
//                 this.languages$.next(langs);
//             }));
//     }

//     // 🚀 Fetch translations for an active language
//     loadTranslations(lang: string) {
//         const url = `${this.config.i18nTranslationsUrl}?lang=${lang}`;

//         return this.http
//             .get<{ [key: string]: string }>(url)
//             .pipe(tap(translations => {
//                 this.translations$.next(translations);
//             }));
//     }

//     // 🚀 Change language from header dropdown
//     setLanguage(lang: string) {
//         localStorage.setItem('lang', lang);
//         this.currentLang$.next(lang);

//         // Load new translations
//         this.loadTranslations(lang).subscribe();
//     }

//     // 🚀 Translate a key
//     t(key: string): string {
//         return this.translations$.value[key] ?? key;
//     }
// }
