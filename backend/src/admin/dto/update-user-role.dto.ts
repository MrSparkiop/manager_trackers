import { IsString, IsIn } from 'class-validator'

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['USER', 'PRO', 'ADMIN'])
  role: string
}
