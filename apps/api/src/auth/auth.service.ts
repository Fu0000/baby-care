import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import type { LoginDto, RegisterDto } from './dto'

interface AccessPayload {
  sub: string
  sid: string
}

interface RefreshPayload extends AccessPayload {
  type: 'refresh'
}

export interface AuthUserView {
  id: string
  phone: string
  nickname: string | null
  inviteBound: boolean
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResult extends AuthTokens {
  user: AuthUserView
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
    if (exists) {
      throw new BadRequestException('Phone already registered')
    }

    const passwordHash = await argon2.hash(dto.password)
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        nickname: dto.nickname?.trim() || null,
      },
    })

    return this.createSessionForUser(user.id)
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
    if (!user) {
      throw new UnauthorizedException('Invalid phone or password')
    }

    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok) {
      throw new UnauthorizedException('Invalid phone or password')
    }

    return this.createSessionForUser(user.id)
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefresh(refreshToken)
    const session = await this.prisma.authSession.findUnique({ where: { id: payload.sid } })

    if (!session || session.revokedAt || session.userId !== payload.sub) {
      throw new UnauthorizedException('Session invalid')
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired')
    }

    const hashOk = await argon2.verify(session.refreshTokenHash, refreshToken)
    if (!hashOk) {
      throw new UnauthorizedException('Refresh token invalid')
    }

    const tokens = await this.issueTokens(payload.sub, session.id)
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: await argon2.hash(tokens.refreshToken),
        expiresAt: this.getRefreshExpiryDate(),
      },
    })

    return tokens
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async getMe(userId: string): Promise<AuthUserView> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      inviteBound: user.inviteBound,
      createdAt: user.createdAt.toISOString(),
    }
  }

  async updateProfile(
    userId: string,
    dto: { nickname?: string },
  ): Promise<AuthUserView> {
    if (dto.nickname === undefined) {
      throw new BadRequestException('No updates')
    }

    const trimmed = dto.nickname.trim()
    if (trimmed.length > 32) {
      throw new BadRequestException('Nickname too long')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { nickname: trimmed.length === 0 ? null : trimmed },
    })

    return this.getMe(userId)
  }

  private async createSessionForUser(userId: string): Promise<AuthResult> {
    const session = await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash: 'pending',
        expiresAt: this.getRefreshExpiryDate(),
      },
    })

    const tokens = await this.issueTokens(userId, session.id)

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: await argon2.hash(tokens.refreshToken),
      },
    })

    return {
      ...tokens,
      user: await this.getMe(userId),
    }
  }

  private async issueTokens(userId: string, sessionId: string): Promise<AuthTokens> {
    const accessPayload: AccessPayload = { sub: userId, sid: sessionId }
    const refreshPayload: RefreshPayload = { ...accessPayload, type: 'refresh' }

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
      expiresIn: this.getAccessTokenTtlSeconds(),
    })

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      expiresIn: this.getRefreshTokenTtlSeconds(),
    })

    return { accessToken, refreshToken }
  }

  private async verifyRefresh(token: string): Promise<RefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      })

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh payload')
      }

      return payload
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  private getRefreshExpiryDate(): Date {
    return new Date(Date.now() + this.getRefreshTokenTtlSeconds() * 1000)
  }

  private getAccessTokenTtlSeconds(): number {
    return Number(this.configService.get<string>('JWT_ACCESS_TTL_SECONDS', '900'))
  }

  private getRefreshTokenTtlSeconds(): number {
    return Number(
      this.configService.get<string>(
        'JWT_REFRESH_TTL_SECONDS',
        String(30 * 24 * 60 * 60),
      ),
    )
  }
}
