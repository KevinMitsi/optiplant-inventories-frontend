import { Role } from '../enums/role.enum';
import { PageQuery } from './page-query.model';

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

/** Campo de la lista de usuarios que se ordena. */
export type UserSortField = 'firstName' | 'lastName' | 'email' | 'active' | 'lastLoginAt' | 'createdAt';

/** Filtros + paginación de `GET /organizations/{organizationId}/users`. */
export interface UserQuery extends PageQuery {
  sortBy?: UserSortField;
  branchId?: string;
  role?: Role;
  text?: string;
  active?: boolean;
}

/**
 * Datos de alta de un usuario (`CreateUserRequest`). `branchId` es
 * obligatorio para `BRANCH_MANAGER`/`INVENTORY_OPERATOR` y debe omitirse
 * para `ADMIN` (RN-12/RN-13) — la validación de esa coherencia vive en el
 * formulario, el backend la repite como último resguardo (422).
 */
export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  branchId?: string;
}

/** Datos personales editables (`UpdateUserProfileRequest`): sin correo, rol, sucursal ni contraseña. */
export interface UpdateUserProfileInput {
  firstName: string;
  lastName: string;
}

/** Nuevo rol + sucursal de un usuario (`ReassignUserRequest`) — cambian siempre juntos (ver APIDOC.json). */
export interface ReassignUserInput {
  role: Role;
  branchId?: string;
}
