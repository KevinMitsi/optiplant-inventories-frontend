import { Observable } from 'rxjs';
import { Category, CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from '../models/category.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para categorías. Mismo patrón que `BranchRepository`.
 * Implementación en `core/infrastructure/repositories/category-http.repository.ts`.
 */
export abstract class CategoryRepository {
  abstract search(organizationId: string, query: CategoryQuery): Observable<Page<Category>>;
  abstract getById(categoryId: string): Observable<Category>;
  abstract create(organizationId: string, input: CreateCategoryInput): Observable<Category>;
  abstract update(categoryId: string, input: UpdateCategoryInput): Observable<Category>;
  abstract activate(categoryId: string): Observable<Category>;
  abstract deactivate(categoryId: string): Observable<Category>;
}
