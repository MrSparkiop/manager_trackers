import { IsString, MinLength, MaxLength } from 'class-validator'

export class JoinTeamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  inviteCode: string
}
