import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto, RefreshTokenDto, RegisterDto, UpdateProfileDto } from './dto'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'
import type { AuthUser } from '../common/auth/auth-user.interface'

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthUser) {
    return this.authService.logout(user.id, user.sessionId)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id)
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto)
  }
}
