import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { BootstrapSyncDto } from './dto'

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(userId: string, payload: BootstrapSyncDto): Promise<{ uploadedAt: string }> {
    const normalizedPayload = this.normalizeBootstrapPayload(userId, payload)

    const snapshot = await this.prisma.syncSnapshot.create({
      data: {
        userId,
        payload: normalizedPayload as unknown as Prisma.InputJsonValue,
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
        payload: this.normalizeGenericPayload(userId, payload) as Prisma.InputJsonValue,
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

  private normalizeBootstrapPayload(userId: string, payload: BootstrapSyncDto): BootstrapSyncDto {
    return {
      ...payload,
      sessions: this.normalizeRecordsUserId(userId, payload.sessions),
      contractionSessions: this.normalizeRecordsUserId(userId, payload.contractionSessions),
      contractions: this.normalizeRecordsUserId(userId, payload.contractions),
      hospitalBagItems: this.normalizeRecordsUserId(userId, payload.hospitalBagItems),
      feedingRecords: this.normalizeRecordsUserId(userId, payload.feedingRecords),
    }
  }

  private normalizeGenericPayload(
    userId: string,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.deepNormalizeValue(userId, payload) as Record<string, unknown>
  }

  private deepNormalizeValue(userId: string, value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.deepNormalizeValue(userId, item))
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      const normalized = Object.fromEntries(
        Object.entries(record).map(([key, nested]) => [key, this.deepNormalizeValue(userId, nested)]),
      )

      if ('userId' in record) {
        const recordUserId = record.userId
        if (typeof recordUserId === 'string' && recordUserId !== userId) {
          throw new BadRequestException('Sync payload userId mismatch')
        }
        return { ...normalized, userId }
      }

      return normalized
    }

    return value
  }

  private normalizeRecordsUserId(
    userId: string,
    records?: Record<string, unknown>[],
  ): Record<string, unknown>[] | undefined {
    if (!records) return records

    return records.map((record) => {
      if ('userId' in record) {
        const recordUserId = record.userId
        if (typeof recordUserId === 'string' && recordUserId !== userId) {
          throw new BadRequestException('Sync payload userId mismatch')
        }
      }

      return { ...record, userId }
    })
  }
}
