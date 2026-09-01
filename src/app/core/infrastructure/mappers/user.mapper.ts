import { Role } from '../../domain/enums/role.enum';
import { User } from '../../domain/models/user.model';
import { UserResponseDto } from '../http/dtos/auth.dto';

export const toUser = (dto: UserResponseDto): User => ({
  id: dto.id,
  organizationId: dto.organizationId,
  // Backend omite la clave para ADMIN (sin sucursal propia) en vez de mandar
  // `null` explícito: sin normalizar, `dto.branchId` llega `undefined` y el
  // resto de la app (comprobaciones `=== null`, ej. `isAdmin` en inventario)
  // lo trata como "tiene sucursal" en lugar de "es admin".
  branchId: dto.branchId ?? null,
  role: dto.role as Role,
  roleName: dto.roleName,
  firstName: dto.firstName,
  lastName: dto.lastName,
  email: dto.email,
  active: dto.active,
  lastLoginAt: dto.lastLoginAt,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});
