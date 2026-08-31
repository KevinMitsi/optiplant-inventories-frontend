import { Role } from '../enums/role.enum';

/**
 * Entidad de dominio para el usuario del sistema (ver `UserResponse` en APIDOC.json).
 * Independiente de cómo el backend serializa la respuesta: el mapeo vive en
 * `core/infrastructure/mappers`.
 */
export interface User {
  id: string;
  organizationId: string;
  /** Nulo para ADMIN, cuyo ámbito es la organización completa (RN-12). */
  branchId: string | null;
  role: Role;
  roleName: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fullName = (user: Pick<User, 'firstName' | 'lastName'>): string =>
  `${user.firstName} ${user.lastName}`.trim();
