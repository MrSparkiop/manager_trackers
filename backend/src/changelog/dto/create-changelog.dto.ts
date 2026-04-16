import { IsString, MinLength, MaxLength, Matches } from 'class-validator'

export class CreateChangelogDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'version must be in semver format (e.g. 1.0.0)' })
  version: string

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string

  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  content: string
}
