import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { InventoryMovement, RegisterInventoryMovementInput } from '../../domain/models/inventory.model';

/** Salida manual sin documento de origen (`LOSS_OUT`, HU-13). Falla con 422 si no hay stock suficiente (RN-03). */
@Injectable({ providedIn: 'root' })
export class RegisterInventoryExitUseCase {
  private readonly inventoryRepository = inject(InventoryRepository);

  execute(branchId: string, input: RegisterInventoryMovementInput): Observable<InventoryMovement> {
    return this.inventoryRepository.registerExit(branchId, input);
  }
}
