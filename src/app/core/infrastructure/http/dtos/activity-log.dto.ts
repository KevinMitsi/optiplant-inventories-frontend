/** Forma de red exacta de `ActivityLogResponse` (ver APIDOC.json). */

export interface ActivityLogResponseDto {
  id: string;
  occurredAt: string;
  username: string;
  userId: string | null;
  organizationId: string | null;
  role: string;
  useCase: string;
  operation: string;
  level: string;
  systemGenerated: boolean;
}
