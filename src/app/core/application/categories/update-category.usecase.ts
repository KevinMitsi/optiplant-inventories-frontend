import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category, UpdateCategoryInput } from '../../domain/models/category.model';

@Injectable({ providedIn: 'root' })
export class UpdateCategoryUseCase {
  private readonly categoryRepository = inject(CategoryRepository);

  execute(categoryId: string, input: UpdateCategoryInput): Observable<Category> {
    return this.categoryRepository.update(categoryId, input);
  }
}
