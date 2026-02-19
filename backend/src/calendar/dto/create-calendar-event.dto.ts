import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator'

export class CreateCalendarEventDto {
  @IsString()
  title: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  startTime: string

  @IsDateString()
  endTime: string

  @IsBoolean()
  @IsOptional()
  allDay?: boolean

  @IsString()
  @IsOptional()
  color?: string

  @IsString()
  @IsOptional()
  taskId?: string
}