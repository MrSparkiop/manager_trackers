import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator'

export class CreateTeamProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string
}
