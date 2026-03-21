import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ProjectsService } from './projects.service'
import { ProjectOwnerGuard } from './project-owner.guard'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@UseGuards(AuthGuard('jwt'), ProjectOwnerGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.projectsService.findAll(user.id)
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser) {
    return this.projectsService.getStats(user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findOne(id, user.id)
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.create(user.id, dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.update(id, user.id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.remove(id, user.id)
  }
}
