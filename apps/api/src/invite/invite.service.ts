import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InviteCodeStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class InviteService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<{ inviteBound: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { inviteBound: true },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    return { inviteBound: user.inviteBound }
  }

  async bindInviteCode(
    userId: string,
    rawCode: string,
    metadata: { deviceId?: string; ip?: string },
  ): Promise<{ inviteBound: boolean; code: string }> {
    const code = rawCode.trim().toUpperCase()

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { inviteBound: true },
      })

      if (!user) {
        throw new NotFoundException('User not found')
      }

      if (user.inviteBound) {
        return { inviteBound: true, code: 'ALREADY_BOUND' }
      }

      const invite = await tx.inviteCode.findUnique({ where: { code } })
      if (!invite) {
        throw new BadRequestException('邀请码不存在')
      }

      if (invite.status !== InviteCodeStatus.ACTIVE) {
        throw new BadRequestException('邀请码不可用')
      }

      if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) {
        await tx.inviteCode.update({
          where: { id: invite.id },
          data: { status: InviteCodeStatus.EXPIRED },
        })
        throw new BadRequestException('邀请码已过期')
      }

      if (invite.usedCount >= invite.maxUses) {
        await tx.inviteCode.update({
          where: { id: invite.id },
          data: { status: InviteCodeStatus.USED },
        })
        throw new BadRequestException('邀请码已被使用')
      }

      await tx.inviteRedemption.create({
        data: {
          inviteCodeId: invite.id,
          userId,
          deviceId: metadata.deviceId,
          ip: metadata.ip,
        },
      })

      const nextUsed = invite.usedCount + 1
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: {
          usedCount: nextUsed,
          status: nextUsed >= invite.maxUses ? InviteCodeStatus.USED : InviteCodeStatus.ACTIVE,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: { inviteBound: true },
      })

      return { inviteBound: true, code }
    })
  }
}
