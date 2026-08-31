/**
 * DTOs = forma exacta en que el backend serializa JSON (ver APIDOC.json,
 * schemas `LoginRequest`, `RefreshTokenRequest`, `AuthenticationResponse`,
 * `UserResponse`). Viven solo en infraestructura; el resto de la app trabaja
 * con las entidades de `core/domain/models`, mapeadas en
 * `core/infrastructure/mappers`.
 */
export interface UserResponseDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  role: string;
  roleName: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticationResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponseDto;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}
