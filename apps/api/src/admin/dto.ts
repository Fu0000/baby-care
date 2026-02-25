import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateInvitesDto {
  @IsInt()
  @Min(1)
  @Max(500)
  count!: number

  @IsString()
  @IsOptional()
  expiresAt?: string
}
