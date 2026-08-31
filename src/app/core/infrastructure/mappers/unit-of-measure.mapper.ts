import { UnitOfMeasure } from '../../domain/models/unit-of-measure.model';
import { UnitOfMeasureResponseDto } from '../http/dtos/unit-of-measure.dto';

export function toUnitOfMeasure(dto: UnitOfMeasureResponseDto): UnitOfMeasure {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    symbol: dto.symbol,
  };
}
