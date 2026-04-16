import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/permissions.guard'
import { RequirePermissions } from '../auth/permissions'
import { TeamMemberGuard } from './team-member.guard'
import { TeamsService } from './teams.service'
import { CustomRolesService } from './custom-roles.service'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import { UpdateTeamProjectDto } from './dto/update-team-project.dto'
import { UpdateTeamTaskDto } from './dto/update-team-task.dto'
import { CreateTeamDto } from './dto/create-team.dto'
import { UpdateTeamDto } from './dto/update-team.dto'
import { JoinTeamDto } from './dto/join-team.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'
import { CreateTeamProjectDto } from './dto/create-team-project.dto'
import { CreateTeamTaskDto } from './dto/create-team-task.dto'
import { AddCommentDto } from './dto/add-comment.dto'
import { CreateCustomRoleDto } from './dto/create-custom-role.dto'
import { UpdateCustomRoleDto } from './dto/update-custom-role.dto'
import { AssignCustomRoleDto } from './dto/assign-custom-role.dto'

@ApiTags('Teams')
@UseGuards(AuthGuard('jwt'))
@Controller('teams')
export class TeamsController {
  constructor(
    private teamsService: TeamsService,
    private customRolesService: CustomRolesService,
  ) {}

  // ── Teams ────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get my teams' })
  getMyTeams(@CurrentUser() user: AuthUser) {
    return this.teamsService.getMyTeams(user.id)
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('create:team')
  @ApiOperation({ summary: 'Create a team' })
  createTeam(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(user.id, dto, user.role)
  }

  @Get('join')
  @ApiOperation({ summary: 'Get team info from invite code' })
  getTeamByInviteCode(@Query('code') code: string) {
    return this.teamsService.getTeamByInviteCode(code)
  }

  @Post('join')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('join:team')
  @ApiOperation({ summary: 'Join a team via invite code' })
  joinTeam(@CurrentUser() user: AuthUser, @Body() dto: JoinTeamDto) {
    return this.teamsService.joinTeam(dto.inviteCode, user.id)
  }

  @Get(':id')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Get team details' })
  getTeam(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getTeam(id, user.id)
  }

  @Put(':id')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Update team' })
  updateTeam(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateTeamDto) {
    return this.teamsService.updateTeam(id, user.id, dto)
  }

  @Delete(':id')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Delete team' })
  deleteTeam(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.deleteTeam(id, user.id)
  }

  @Get(':id/invite')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Get invite link' })
  getInviteLink(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getInviteLink(id, user.id)
  }

  @Get(':id/activity')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Get team activity feed' })
  getTeamActivity(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getTeamActivity(id, user.id)
  }

  @Get(':id/workload')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Get member workload' })
  getTeamWorkload(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getTeamWorkload(id, user.id)
  }

  @Post(':id/invite/regenerate')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Regenerate invite code' })
  regenerateInviteCode(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.regenerateInviteCode(id, user.id)
  }

  @Delete(':id/leave')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Leave team' })
  leaveTeam(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.leaveTeam(id, user.id)
  }

  @Delete(':id/members/:memberId')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Remove a member' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.removeMember(id, user.id, memberId)
  }

  @Patch(':id/members/:memberId/role')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Update member role (Owner only)' })
  updateMemberRole(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateMemberRoleDto) {
    return this.teamsService.updateMemberRole(id, user.id, memberId, dto.role)
  }

  // ── Team Projects ────────────────────────────────────────────────
  @Get(':id/projects')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Get team projects' })
  getTeamProjects(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getTeamProjects(id, user.id)
  }

  @Post(':id/projects')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Create team project' })
  createTeamProject(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: CreateTeamProjectDto) {
    return this.teamsService.createTeamProject(id, user.id, dto)
  }

  @Put('projects/:projectId')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Update team project' })
  updateTeamProject(@Param('projectId') projectId: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateTeamProjectDto) {
    return this.teamsService.updateTeamProject(projectId, user.id, dto)
  }

  @Delete('projects/:projectId')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Delete team project' })
  deleteTeamProject(@Param('projectId') projectId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.deleteTeamProject(projectId, user.id)
  }

  // ── Team Tasks ───────────────────────────────────────────────────
  @Get('projects/:projectId/tasks')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Get team project tasks' })
  getTeamTasks(@Param('projectId') projectId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getTeamTasks(projectId, user.id)
  }

  @Post('projects/:projectId/tasks')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Create team task' })
  createTeamTask(@Param('projectId') projectId: string, @CurrentUser() user: AuthUser, @Body() dto: CreateTeamTaskDto) {
    return this.teamsService.createTeamTask(projectId, user.id, dto)
  }

  @Put('tasks/:taskId')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Update team task' })
  updateTeamTask(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateTeamTaskDto) {
    return this.teamsService.updateTeamTask(taskId, user.id, dto)
  }

  @Delete('tasks/:taskId')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Delete team task' })
  deleteTeamTask(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.deleteTeamTask(taskId, user.id)
  }

  // ── Recurring Team Tasks ─────────────────────────────────────────
  @Post('tasks/:taskId/next-occurrence')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Create next occurrence of a recurring team task' })
  createNextTeamOccurrence(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.createNextTeamOccurrence(taskId, user.id)
  }

  @Post('tasks/:taskId/skip-occurrence')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Skip next occurrence of a recurring team task' })
  skipNextTeamOccurrence(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.skipNextTeamOccurrence(taskId, user.id)
  }

  // ── Comments ─────────────────────────────────────────────────────
  @Post('tasks/:taskId/comments')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Add comment to task' })
  addComment(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser, @Body() dto: AddCommentDto) {
    return this.teamsService.addComment(taskId, user.id, dto.content)
  }

  @Delete('comments/:commentId')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Delete comment' })
  deleteComment(@Param('commentId') commentId: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.deleteComment(commentId, user.id)
  }

  // ── Custom Team Roles ─────────────────────────────────────────────
  @Get(':id/custom-roles')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'List custom roles for a team' })
  listCustomRoles(@Param('id') id: string) {
    return this.customRolesService.list(id)
  }

  @Post(':id/custom-roles')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Create a custom role (Owner only)' })
  createCustomRole(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: CreateCustomRoleDto) {
    return this.customRolesService.create(id, user.id, dto)
  }

  @Put(':id/custom-roles/:roleId')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Update a custom role (Owner only)' })
  updateCustomRole(@Param('id') id: string, @Param('roleId') roleId: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateCustomRoleDto) {
    return this.customRolesService.update(id, roleId, user.id, dto)
  }

  @Delete(':id/custom-roles/:roleId')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Delete a custom role (Owner only)' })
  deleteCustomRole(@Param('id') id: string, @Param('roleId') roleId: string, @CurrentUser() user: AuthUser) {
    return this.customRolesService.remove(id, roleId, user.id)
  }

  @Patch(':id/members/:memberId/custom-role')
  @UseGuards(TeamMemberGuard)
  @ApiOperation({ summary: 'Assign or clear a custom role on a member (Owner only)' })
  assignCustomRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AssignCustomRoleDto,
  ) {
    return this.customRolesService.assignToMember(id, memberId, user.id, dto.customRoleId)
  }
}
