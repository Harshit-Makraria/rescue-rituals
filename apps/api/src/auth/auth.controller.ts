import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { AuthTokensResponse, LoginDto, RefreshDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guards';

@ApiTags('auth')
@ApiTooManyRequestsResponse({ description: 'Rate limited' })
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Create an account and get tokens. */
  @Post('register')
  @ApiCreatedResponse({ type: AuthTokensResponse })
  @ApiConflictResponse({ description: 'Email already registered' })
  register(@Body() dto: RegisterDto): Promise<AuthTokensResponse> {
    return this.auth.register(dto);
  }

  /** Log in with email and password. */
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthTokensResponse })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  login(@Body() dto: LoginDto): Promise<AuthTokensResponse> {
    return this.auth.login(dto);
  }

  /** Exchange a refresh token for a new token pair (the old refresh token stops working). */
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthTokensResponse })
  @ApiUnauthorizedResponse({ description: 'Refresh token expired, reused or revoked' })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensResponse> {
    return this.auth.refresh(dto.refreshToken);
  }

  /** Revoke the current session's refresh token. */
  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiNoContentResponse()
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.logout(user.id);
  }
}
