import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { ProjectsService } from './projects.service'

@ApiTags('projects')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects for current user' })
  findAll(@Req() req: any) {
    return this.projectsService.findAll(req.user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Req() req: any, @Body() dto: any) {
    return this.projectsService.create(req.user.id, dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.projectsService.update(req.user.id, id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.remove(req.user.id, id)
  }
}