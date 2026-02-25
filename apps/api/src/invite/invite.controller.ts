import { Body, Controller, Get, Headers, Ip, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'
import type { AuthUser } from '../common/auth/auth-user.interface'
import { BindInviteDto } from './dto'
import { InviteService } from './invite.service'

@Controller('v1/invites')
@UseGuards(JwtAuthGuard)
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.inviteService.getStatus(user.id)
  }

  @Post('bind')
  bind(
    @CurrentUser() user: AuthUser,
    @Body() dto: BindInviteDto,
    @Headers('x-device-id') deviceId: string | undefined,
    @Ip() ip: string,
  ) {
    return this.inviteService.bindInviteCode(user.id, dto.code, { deviceId, ip })
  }
}
