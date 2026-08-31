import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  inject,
} from '@angular/core';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { AuthRepository } from './core/domain/repositories/auth.repository';
import { AuthHttpRepository } from './core/infrastructure/repositories/auth-http.repository';
import { authInterceptor } from './core/infrastructure/http/auth.interceptor';
import { errorNormalizerInterceptor } from './core/infrastructure/http/error-normalizer.interceptor';
import { refreshInterceptor } from './core/infrastructure/http/refresh.interceptor';
import { BootstrapSessionUseCase } from './core/application/auth/bootstrap-session.usecase';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      // Orden importa: en la petición, auth adjunta el token y refresh queda
      // más cerca del backend; en la respuesta de error ocurre al revés
      // (refresh ve el 401 crudo primero y reintenta antes de que
      // error-normalizer convierta lo que quede a `ApiError`).
      withInterceptors([authInterceptor, errorNormalizerInterceptor, refreshInterceptor]),
    ),
    // Enlaza el puerto de dominio con su implementación HTTP (Clean Architecture).
    { provide: AuthRepository, useClass: AuthHttpRepository },
    // Resuelve si hay sesión válida antes de que el router active ningún guard.
    provideAppInitializer(() => firstValueFrom(inject(BootstrapSessionUseCase).execute())),
  ],
};
