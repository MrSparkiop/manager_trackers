import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateSystemConfigsDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  disableRegistrations?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  maintenanceMode?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  maintenanceMessage?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  siteName?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  maxUsersAllowed?: string
}
