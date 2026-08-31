import { Routes } from '@angular/router';

/** Catálogo de solo lectura: sin `roleGuard`, cualquier autenticado lo consulta. */
export const UNITS_OF_MEASURE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./unit-of-measure-list/unit-of-measure-list.page').then((m) => m.UnitOfMeasureListPage),
    title: 'Unidades de medida · OptiPlant',
  },
];
