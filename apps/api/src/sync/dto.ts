import { IsArray, IsObject, IsOptional } from 'class-validator'

export class BootstrapSyncDto {
  @IsObject()
  settings!: Record<string, unknown>

  @IsArray()
  @IsOptional()
  sessions?: Record<string, unknown>[]

  @IsArray()
  @IsOptional()
  contractionSessions?: Record<string, unknown>[]

  @IsArray()
  @IsOptional()
  contractions?: Record<string, unknown>[]

  @IsArray()
  @IsOptional()
  hospitalBagItems?: Record<string, unknown>[]

  @IsArray()
  @IsOptional()
  feedingRecords?: Record<string, unknown>[]
}
