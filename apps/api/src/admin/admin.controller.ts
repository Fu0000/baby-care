import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AdminService } from './admin.service'
import { CreateInvitesDto } from './dto'

@Controller('v1/admin/invites')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  create(
    @Headers('x-admin-key') adminKey: string | undefined,
    @Body() dto: CreateInvitesDto,
  ) {
    this.assertAdminKey(adminKey)
    return this.adminService.createInvites(dto)
  }

  @Get()
  list(@Headers('x-admin-key') adminKey: string | undefined) {
    this.assertAdminKey(adminKey)
    return this.adminService.listInvites()
  }

  private assertAdminKey(key: string | undefined): void {
    const expected = this.configService.get<string>('ADMIN_API_KEY', 'dev-admin-key')
    if (!key || key !== expected) {
      throw new ForbiddenException('Invalid admin key')
    }
  }
}
