import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { ConfigService } from './app/services/config.service';
import { APP_INITIALIZER } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { MockApiInterceptor } from './app/services/mock-api.interceptor';

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
    },

    // ✅ ONLY ONE INTERCEPTOR
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MockApiInterceptor,
      multi: true
    }
  ]
}).catch(err => console.error(err));
