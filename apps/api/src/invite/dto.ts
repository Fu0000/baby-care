import { IsString, Length } from 'class-validator'

export class BindInviteDto {
  @IsString()
  @Length(6, 32)
  code!: string
}
