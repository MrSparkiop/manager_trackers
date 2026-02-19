import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateTimeEntryDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  taskId?: string;
}