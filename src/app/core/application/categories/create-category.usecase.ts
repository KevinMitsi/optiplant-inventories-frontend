import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category, CreateCategoryInput } from '../../domain/models/category.model';

@Injectable({ providedIn: 'root' })
export class CreateCategoryUseCase {
  private readonly categoryRepository = inject(CategoryRepository);

  execute(organizationId: string, input: CreateCategoryInput): Observable<Category> {
    return this.categoryRepository.create(organizationId, input);
  }
}
