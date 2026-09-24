import { Transform } from 'class-transformer';
import { IsEmail, IsJWT, IsString, MaxLength, MinLength } from 'class-validator';

const normaliseEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  /** @example "you@example.com" */
  @Transform(normaliseEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  /** At least 8 characters. @example "Password123!" */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  /** @example "Asha Rao" */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}

export class LoginDto {
  /** @example "demo@events.dev" */
  @Transform(normaliseEmail)
  @IsEmail()
  email: string;

  /** @example "Password123!" */
  @IsString()
  @MaxLength(128)
  password: string;
}

export class RefreshDto {
  @IsJWT()
  refreshToken: string;
}

export class PublicUser {
  id: string;
  email: string;
  name: string;
}

export class AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds */
  expiresIn: number;
  user: PublicUser;
}
