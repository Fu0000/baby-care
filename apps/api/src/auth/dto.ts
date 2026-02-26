import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

const PHONE_PATTERN = /^1\d{10}$/

export class RegisterDto {
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be an 11-digit mainland number' })
  phone!: string

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string

  @IsString()
  @IsOptional()
  @MaxLength(32)
  nickname?: string
}

export class LoginDto {
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be an 11-digit mainland number' })
  phone!: string

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(32)
  nickname?: string
}
