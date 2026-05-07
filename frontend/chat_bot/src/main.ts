import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { ConfigService } from './app/services/config.service';
import { APP_INITIALIZER } from '@angular/core';

import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { MockApiInterceptor } from './app/services/mock-api.interceptor';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

export function loadConfig(config: ConfigService) {
  return () => config.loadConfig();
}

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...appConfig.providers!,
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: loadConfig,
      deps: [ConfigService],
      multi: true
    }
  ]
}).catch(err => console.error(err));
