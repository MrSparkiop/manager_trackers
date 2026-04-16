import { IsOptional, IsString } from 'class-validator'

export class AssignCustomRoleDto {
  @IsOptional()
  @IsString()
  customRoleId: string | null
}
