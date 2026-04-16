import { IsString, MinLength, MaxLength } from 'class-validator'

export class ReportMessageDto {
  @IsString()
  @MinLength(1)
  messageId: string

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason: string
}
