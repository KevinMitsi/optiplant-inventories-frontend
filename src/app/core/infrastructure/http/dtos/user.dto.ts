/** Formas de red exactas de `APIDOC.json` para usuarios. Aisladas aquí; el
 * resto de la app trabaja con `core/domain/models/user.model.ts`.
 * `UserResponseDto` ya vive en `auth.dto.ts` (la comparte con el login) y se
 * reutiliza tal cual, en vez de duplicarla. */

export interface CreateUserRequestDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  branchId?: string;
}

export interface UpdateUserProfileRequestDto {
  firstName: string;
  lastName: string;
}

export interface ReassignUserRequestDto {
  role: string;
  branchId?: string;
}
