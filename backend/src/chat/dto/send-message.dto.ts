import { IsString, MaxLength, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator'

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string

  @IsOptional()
  @IsString()
  @IsIn(['TEXT', 'VOICE', 'CALL'])
  type?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  audioUrl?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  audioDuration?: number
}
