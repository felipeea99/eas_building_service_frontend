import { ApplicationConfig, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';

registerLocaleData(localeEsMx);
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';


import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { utcDateInterceptor } from './core/interceptors/utc-date.interceptor';

export const appConfig: ApplicationConfig = {
 providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-MX' },
    provideRouter(routes, withComponentInputBinding()), // permite pasar params de ruta como @Input()
    provideHttpClient(
      //withFetch(), // se usa en default ya
      withInterceptors([authInterceptor, errorInterceptor, utcDateInterceptor])
    ),
  ]
};
