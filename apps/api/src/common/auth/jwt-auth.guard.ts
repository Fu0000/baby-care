import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import type { AuthUser } from './auth-user.interface'

interface AccessPayload {
  sub: string
  sid: string
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>
      user?: AuthUser
    }>()

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const token = authHeader.slice('Bearer '.length)
    let payload: AccessPayload

    try {
      payload = await this.jwtService.verifyAsync<AccessPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
      })
    } catch {
      throw new UnauthorizedException('Invalid access token')
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
      select: { revokedAt: true, expiresAt: true, userId: true },
    })

    if (!session || session.userId !== payload.sub || session.revokedAt) {
      throw new UnauthorizedException('Session not active')
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired')
    }

    request.user = { id: payload.sub, sessionId: payload.sid }
    return true
  }
}
