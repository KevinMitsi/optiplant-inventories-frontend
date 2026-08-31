import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/**
 * Mismo criterio que `categories.routes.ts` y `products.routes.ts`: el
 * listado es visible para cualquier autenticado (hace falta para conocer
 * precios vigentes); alta/edición/fijar precio quedan reservadas a ADMIN
 * (HU-25 es una operación de gestión de catálogo, no operativa).
 */
export const PRICE_LISTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./price-list-list/price-list-list.page').then((m) => m.PriceListListPage),
    title: 'Listas de precios · OptiPlant',
  },
  {
    path: 'new',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./price-list-form/price-list-form.page').then((m) => m.PriceListFormPage),
    title: 'Nueva lista de precios · OptiPlant',
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./price-list-form/price-list-form.page').then((m) => m.PriceListFormPage),
    title: 'Editar lista de precios · OptiPlant',
  },
];
