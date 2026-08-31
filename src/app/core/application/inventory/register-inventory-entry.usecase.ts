import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { InventoryMovement, RegisterInventoryMovementInput } from '../../domain/models/inventory.model';

/** Entrada manual sin documento de origen (`RETURN_IN`, HU-12). */
@Injectable({ providedIn: 'root' })
export class RegisterInventoryEntryUseCase {
  private readonly inventoryRepository = inject(InventoryRepository);

  execute(branchId: string, input: RegisterInventoryMovementInput): Observable<InventoryMovement> {
    return this.inventoryRepository.registerEntry(branchId, input);
  }
}
