import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category, CategoryQuery } from '../../domain/models/category.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchCategoriesUseCase {
  private readonly categoryRepository = inject(CategoryRepository);

  execute(organizationId: string, query: CategoryQuery): Observable<Page<Category>> {
    return this.categoryRepository.search(organizationId, query);
  }
}
