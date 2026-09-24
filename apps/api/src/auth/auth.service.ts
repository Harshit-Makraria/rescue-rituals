import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokensResponse, LoginDto, RegisterDto } from './auth.dto';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, name: dto.name, passwordHash },
      });
      return this.issueTokens(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('An account with this email already exists.');
      }
      throw e;
    }
  }

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Same message for "no such user" and "wrong password" — no account enumeration.
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.issueTokens(user);
  }

  /**
   * Refresh-token rotation: each refresh token works once. Presenting an old one
   * (possible theft) revokes the session entirely.
   */
  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.refreshTokenHash) throw new UnauthorizedException('Session expired. Please log in again.');

    if (user.refreshTokenHash !== sha256(refreshToken)) {
      await this.prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null } });
      throw new UnauthorizedException('Session revoked. Please log in again.');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.updateMany({ where: { id: userId }, data: { refreshTokenHash: null } });
  }

  private async issueTokens(user: User): Promise<AuthTokensResponse> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, email: user.email },
        { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: ACCESS_TTL_SECONDS },
      ),
      this.jwt.signAsync(
        { sub: user.id, jti: randomUUID() },
        { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: REFRESH_TTL_SECONDS },
      ),
    ]);
    // Refresh tokens are high-entropy, so a fast hash is enough (unlike passwords).
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: sha256(refreshToken) },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL_SECONDS,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
