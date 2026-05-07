import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor'; // fn interceptor
import { MockApiInterceptor } from './services/mock-api.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]) // ✅ GLOBAL AUTH INTERCEPTOR (fn interceptor)
    ),
    {
      provide: HTTP_INTERCEPTORS,
      useValue: loaderInterceptor,
      multi: true
    },
    { provide: HTTP_INTERCEPTORS, useClass: MockApiInterceptor, multi: true }
  ]
};
