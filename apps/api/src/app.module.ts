import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { InviteModule } from './invite/invite.module'
import { SyncModule } from './sync/sync.module'
import { AdminModule } from './admin/admin.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    JwtModule.register({
      global: true,
    }),
    PrismaModule,
    AuthModule,
    InviteModule,
    SyncModule,
    AdminModule,
  ],
})
export class AppModule {}
