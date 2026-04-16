import { IsString, IsIn } from 'class-validator'

export class UpdateMemberRoleDto {
  @IsString()
  @IsIn(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'])
  role: string
}
