import { Role } from '../../domain/enums/role.enum';
import { User } from '../../domain/models/user.model';
import { UserResponseDto } from '../http/dtos/auth.dto';

export const toUser = (dto: UserResponseDto): User => ({
  id: dto.id,
  organizationId: dto.organizationId,
  branchId: dto.branchId,
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
