/**
 * Roles de negocio soportados por la API (ver `UserResponse.role` en APIDOC.json).
 * Determinan el ámbito de operación del usuario (RN-12, RN-13):
 * - ADMIN: opera sobre toda la organización, sin sucursal asignada.
 * - BRANCH_MANAGER: opera sobre una sucursal concreta, con permisos de gestión.
 * - INVENTORY_OPERATOR: opera sobre una sucursal concreta, con permisos operativos.
 */
export enum Role {
  Admin = 'ADMIN',
  BranchManager = 'BRANCH_MANAGER',
  InventoryOperator = 'INVENTORY_OPERATOR',
}

export const ALL_ROLES: readonly Role[] = [Role.Admin, Role.BranchManager, Role.InventoryOperator];
