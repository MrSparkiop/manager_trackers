import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator'

export class CreateMaintenanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string

  @IsDateString()
  startTime: string

  @IsDateString()
  endTime: string
}
