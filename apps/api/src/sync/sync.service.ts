import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { BootstrapSyncDto } from './dto'

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(userId: string, payload: BootstrapSyncDto): Promise<{ uploadedAt: string }> {
    const snapshot = await this.prisma.syncSnapshot.create({
      data: {
        userId,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      select: {
        uploadedAt: true,
      },
    })

    return { uploadedAt: snapshot.uploadedAt.toISOString() }
  }

  async push(userId: string, payload: Record<string, unknown>) {
    const snapshot = await this.prisma.syncSnapshot.create({
      data: {
        userId,
        payload: payload as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        uploadedAt: true,
      },
    })

    return snapshot
  }

  async pull(userId: string) {
    const latest = await this.prisma.syncSnapshot.findFirst({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      select: { payload: true, uploadedAt: true },
    })

    return {
      payload: latest?.payload ?? null,
      uploadedAt: latest?.uploadedAt.toISOString() ?? null,
    }
  }
}
