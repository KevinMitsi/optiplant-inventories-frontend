import { RenderMode, ServerRoute } from '@angular/ssr';

// La app depende de cookies de sesión por usuario (JWT) para decidir qué
// mostrar (login vs. dashboard vs. redirecciones de los guards), así que no
// puede pre-renderizarse en build time: cada ruta se renderiza en el
// servidor, por petición, con las cookies de esa petición concreta.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
