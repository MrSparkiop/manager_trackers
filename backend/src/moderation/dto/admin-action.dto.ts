import { IsOptional, IsString, MaxLength } from 'class-validator'

export class AdminActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string
}
