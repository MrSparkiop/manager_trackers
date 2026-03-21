import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator'

export class CreateAnnouncementDto {
  @IsString()
  @MaxLength(200)
  title: string

  @IsString()
  @MaxLength(2000)
  message: string

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
