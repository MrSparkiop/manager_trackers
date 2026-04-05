import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator'

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Color must be a valid hex color (e.g. #6366f1)' })
  color?: string
}
