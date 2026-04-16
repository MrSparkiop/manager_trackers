import { IsString, MinLength } from 'class-validator'

export class StartConversationDto {
  @IsString()
  @MinLength(1)
  userId: string
}
