import { Injectable } from '@nestjs/common'
import { InviteCodeStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateInvitesDto } from './dto'

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvites(dto: CreateInvitesDto) {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null
    const createdCodes: string[] = []

    for (let i = 0; i < dto.count; i += 1) {
      let code = ''
      for (let retry = 0; retry < 5; retry += 1) {
        const candidate = this.generateCode()
        const exists = await this.prisma.inviteCode.findUnique({ where: { code: candidate } })
        if (!exists) {
          code = candidate
          break
        }
      }

      if (!code) {
        throw new Error('Failed to generate a unique invite code')
      }

      await this.prisma.inviteCode.create({
        data: {
          code,
          status: InviteCodeStatus.ACTIVE,
          maxUses: 1,
          expiresAt,
        },
      })

      createdCodes.push(code)
    }

    return { codes: createdCodes }
  }

  async listInvites() {
    return this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let out = 'BC'
    for (let i = 0; i < 8; i += 1) {
      out += chars[Math.floor(Math.random() * chars.length)]
    }
    return out
  }
}
