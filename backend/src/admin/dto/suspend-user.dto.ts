import { IsBoolean } from 'class-validator'

export class SuspendUserDto {
  @IsBoolean()
  suspend: boolean
}
