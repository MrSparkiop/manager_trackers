import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator'

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsString()
  targetRole?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
