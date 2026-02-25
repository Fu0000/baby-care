import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'
import type { AuthUser } from '../common/auth/auth-user.interface'
import { BootstrapSyncDto } from './dto'
import { SyncService } from './sync.service'

@Controller('v1/sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('bootstrap')
  bootstrap(@CurrentUser() user: AuthUser, @Body() dto: BootstrapSyncDto) {
    return this.syncService.bootstrap(user.id, dto)
  }

  @Post('push')
  push(@CurrentUser() user: AuthUser, @Body() payload: Record<string, unknown>) {
    return this.syncService.push(user.id, payload)
  }

  @Get('pull')
  pull(@CurrentUser() user: AuthUser) {
    return this.syncService.pull(user.id)
  }
}
