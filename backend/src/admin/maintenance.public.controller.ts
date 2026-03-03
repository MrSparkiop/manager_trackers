import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { MaintenanceService } from './maintenance.service'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Maintenance')
@UseGuards(AuthGuard('jwt'))
@Controller('maintenance')
export class MaintenancePublicController {
  constructor(private maintenanceService: MaintenanceService) {}

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming/active maintenance window (any authenticated user)' })
  getUpcoming() {
    return this.maintenanceService.getUpcoming()
  }
}
