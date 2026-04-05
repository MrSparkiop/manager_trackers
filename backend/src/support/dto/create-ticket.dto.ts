import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator'

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject: string

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string

  @IsOptional()
  @IsString()
  @IsIn(['general', 'bug', 'feature', 'billing', 'account'])
  category?: string

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string
}
