import { IsString, IsOptional, MaxLength } from 'class-validator'

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  role?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string
}
