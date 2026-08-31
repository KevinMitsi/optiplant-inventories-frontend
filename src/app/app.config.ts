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
import { BranchRepository } from './core/domain/repositories/branch.repository';
import { BranchHttpRepository } from './core/infrastructure/repositories/branch-http.repository';
import { CategoryRepository } from './core/domain/repositories/category.repository';
import { CategoryHttpRepository } from './core/infrastructure/repositories/category-http.repository';
import { CarrierRepository } from './core/domain/repositories/carrier.repository';
import { CarrierHttpRepository } from './core/infrastructure/repositories/carrier-http.repository';
import { SupplierRepository } from './core/domain/repositories/supplier.repository';
import { SupplierHttpRepository } from './core/infrastructure/repositories/supplier-http.repository';
import { UnitOfMeasureRepository } from './core/domain/repositories/unit-of-measure.repository';
import { UnitOfMeasureHttpRepository } from './core/infrastructure/repositories/unit-of-measure-http.repository';
import { ProductRepository } from './core/domain/repositories/product.repository';
import { ProductHttpRepository } from './core/infrastructure/repositories/product-http.repository';
import { PriceListRepository } from './core/domain/repositories/price-list.repository';
import { PriceListHttpRepository } from './core/infrastructure/repositories/price-list-http.repository';
import { InventoryRepository } from './core/domain/repositories/inventory.repository';
import { InventoryHttpRepository } from './core/infrastructure/repositories/inventory-http.repository';
import { InventoryAdjustmentRepository } from './core/domain/repositories/inventory-adjustment.repository';
import { InventoryAdjustmentHttpRepository } from './core/infrastructure/repositories/inventory-adjustment-http.repository';
import { InventoryAlertRepository } from './core/domain/repositories/inventory-alert.repository';
import { InventoryAlertHttpRepository } from './core/infrastructure/repositories/inventory-alert-http.repository';
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
    // Enlaza cada puerto de dominio con su implementación HTTP (Clean Architecture).
    { provide: AuthRepository, useClass: AuthHttpRepository },
    { provide: BranchRepository, useClass: BranchHttpRepository },
    { provide: CategoryRepository, useClass: CategoryHttpRepository },
    { provide: CarrierRepository, useClass: CarrierHttpRepository },
    { provide: SupplierRepository, useClass: SupplierHttpRepository },
    { provide: UnitOfMeasureRepository, useClass: UnitOfMeasureHttpRepository },
    { provide: ProductRepository, useClass: ProductHttpRepository },
    { provide: PriceListRepository, useClass: PriceListHttpRepository },
    { provide: InventoryRepository, useClass: InventoryHttpRepository },
    { provide: InventoryAdjustmentRepository, useClass: InventoryAdjustmentHttpRepository },
    { provide: InventoryAlertRepository, useClass: InventoryAlertHttpRepository },
    // Resuelve si hay sesión válida antes de que el router active ningún guard.
    provideAppInitializer(() => firstValueFrom(inject(BootstrapSessionUseCase).execute())),
  ],
};
