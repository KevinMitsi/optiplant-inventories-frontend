import { AuthSession } from '../../domain/models/auth-session.model';
import { AuthenticationResponseDto } from '../http/dtos/auth.dto';
import { toUser } from './user.mapper';

export const toAuthSession = (dto: AuthenticationResponseDto): AuthSession => ({
  accessToken: dto.accessToken,
  refreshToken: dto.refreshToken,
  tokenType: dto.tokenType,
  expiresIn: dto.expiresIn,
  user: toUser(dto.user),
});
