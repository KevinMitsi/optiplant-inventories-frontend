import { Observable } from 'rxjs';
import { Branch, BranchQuery, CreateBranchInput, UpdateBranchInput } from '../models/branch.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para sucursales. Clase abstracta (no `interface`) por el
 * mismo motivo que `AuthRepository`: necesita ser un token de DI válido.
 * Implementación en `core/infrastructure/repositories/branch-http.repository.ts`.
 */
export abstract class BranchRepository {
  abstract search(organizationId: string, query: BranchQuery): Observable<Page<Branch>>;
  abstract getById(branchId: string): Observable<Branch>;
  abstract create(organizationId: string, input: CreateBranchInput): Observable<Branch>;
  abstract update(branchId: string, input: UpdateBranchInput): Observable<Branch>;
  abstract activate(branchId: string): Observable<Branch>;
  abstract deactivate(branchId: string): Observable<Branch>;
}
