import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator'

export class UpdateCustomRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string

  @IsOptional()
  @IsBoolean()
  canInviteMembers?: boolean

  @IsOptional()
  @IsBoolean()
  canManageProjects?: boolean

  @IsOptional()
  @IsBoolean()
  canDeleteTasks?: boolean

  @IsOptional()
  @IsBoolean()
  canManageSettings?: boolean
}
