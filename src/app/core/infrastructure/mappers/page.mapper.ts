import { Page } from '../../domain/models/page.model';
import { PageResponseDto } from '../http/dtos/page.dto';

/** Mapea una `PageResponseDto<TDto>` a `Page<TDomain>` aplicando `mapItem` a cada elemento. */
export function toPage<TDto, TDomain>(
  dto: PageResponseDto<TDto>,
  mapItem: (item: TDto) => TDomain,
): Page<TDomain> {
  return {
    content: dto.content.map(mapItem),
    page: dto.page,
    size: dto.size,
    numberOfElements: dto.numberOfElements,
    totalElements: dto.totalElements,
    totalPages: dto.totalPages,
    first: dto.first,
    last: dto.last,
    hasNext: dto.hasNext,
  };
}
