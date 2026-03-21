import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateTeamTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  priority?: string

  @IsOptional()
  @IsString()
  dueDate?: string

  @IsOptional()
  @IsString()
  assigneeId?: string

  @IsOptional()
  @IsString()
  recurrence?: string
}
