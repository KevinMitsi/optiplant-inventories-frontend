import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { ssrAbsoluteUrlInterceptor } from './core/infrastructure/http/ssr-absolute-url.interceptor';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // `mergeApplicationConfig` concatena providers después de los de
    // `app.config.ts`, así que este interceptor queda el más cercano al
    // backend (se ejecuta último antes del transporte HTTP real). Es la
    // posición correcta: ni `authInterceptor` ni `errorNormalizerInterceptor`
    // ni `refreshInterceptor` necesitan la URL absoluta, solo el `fetch`
    // final la necesita.
    provideHttpClient(withFetch(), withInterceptors([ssrAbsoluteUrlInterceptor])),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
