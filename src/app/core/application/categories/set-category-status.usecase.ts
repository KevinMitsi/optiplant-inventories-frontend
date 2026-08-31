import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category } from '../../domain/models/category.model';

/**
 * Activa o desactiva una categoría (baja lógica: deja de admitir clasificar
 * productos nuevos, pero los ya clasificados conservan la categoría).
 */
@Injectable({ providedIn: 'root' })
export class SetCategoryStatusUseCase {
  private readonly categoryRepository = inject(CategoryRepository);

  execute(categoryId: string, active: boolean): Observable<Category> {
    return active ? this.categoryRepository.activate(categoryId) : this.categoryRepository.deactivate(categoryId);
  }
}
