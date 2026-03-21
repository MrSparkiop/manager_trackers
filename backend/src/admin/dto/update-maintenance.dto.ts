import { IsString, IsOptional, IsBoolean, MaxLength, IsDateString } from 'class-validator'

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string

  @IsOptional()
  @IsDateString()
  startTime?: string

  @IsOptional()
  @IsDateString()
  endTime?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
