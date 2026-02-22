import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TeamsService } from './teams.service'
import { ApiTags, ApiOperation } from '@nestjs/swagger'

@ApiTags('Teams')
@UseGuards(AuthGuard('jwt'))
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  // ── Teams ────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get my teams' })
  getMyTeams(@Req() req: any) {
    return this.teamsService.getMyTeams(req.user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a team' })
  createTeam(@Req() req: any, @Body() body: { name: string; description?: string; color?: string }) {
    return this.teamsService.createTeam(req.user.id, body)
  }

  @Get('join')
  @ApiOperation({ summary: 'Get team info from invite code' })
  getTeamByInviteCode(@Query('code') code: string) {
    return this.teamsService.getTeamByInviteCode(code)
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a team via invite code' })
  joinTeam(@Req() req: any, @Body() body: { inviteCode: string }) {
    return this.teamsService.joinTeam(body.inviteCode, req.user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details' })
  getTeam(@Param('id') id: string, @Req() req: any) {
    return this.teamsService.getTeam(id, req.user.id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team' })
  updateTeam(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.teamsService.updateTeam(id, req.user.id, body)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  deleteTeam(@Param('id') id: string, @Req() req: any) {
    return this.teamsService.deleteTeam(id, req.user.id)
  }

  @Get(':id/invite')
  @ApiOperation({ summary: 'Get invite link' })
  getInviteLink(@Param('id') id: string, @Req() req: any) {
    return this.teamsService.getInviteLink(id, req.user.id)
  }

  @Post(':id/invite/regenerate')
  @ApiOperation({ summary: 'Regenerate invite code' })
  regenerateInviteCode(@Param('id') id: string, @Req() req: any) {
    return this.teamsService.regenerateInviteCode(id, req.user.id)
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave team' })
  leaveTeam(@Param('id') id: string, @Req() req: any) {
    return this.teamsService.leaveTeam(id, req.user.id)
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Req() req: any) {
    return this.teamsService.removeMember(id, req.user.id, memberId)
  }

  // ── Team Projects ────────────────────────────────────────────────
  @Get(':id/projects')
  @ApiOperation({ summary: 'Get team projects' })
  getTeamProjects(@Param('id') id: string, @Req() req: any) {
    return this.teamsService.getTeamProjects(id, req.user.id)
  }

  @Post(':id/projects')
  @ApiOperation({ summary: 'Create team project' })
  createTeamProject(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.teamsService.createTeamProject(id, req.user.id, body)
  }

  @Put('projects/:projectId')
  @ApiOperation({ summary: 'Update team project' })
  updateTeamProject(@Param('projectId') projectId: string, @Req() req: any, @Body() body: any) {
    return this.teamsService.updateTeamProject(projectId, req.user.id, body)
  }

  @Delete('projects/:projectId')
  @ApiOperation({ summary: 'Delete team project' })
  deleteTeamProject(@Param('projectId') projectId: string, @Req() req: any) {
    return this.teamsService.deleteTeamProject(projectId, req.user.id)
  }

  // ── Team Tasks ───────────────────────────────────────────────────
  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Get team project tasks' })
  getTeamTasks(@Param('projectId') projectId: string, @Req() req: any) {
    return this.teamsService.getTeamTasks(projectId, req.user.id)
  }

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create team task' })
  createTeamTask(@Param('projectId') projectId: string, @Req() req: any, @Body() body: any) {
    return this.teamsService.createTeamTask(projectId, req.user.id, body)
  }

  @Put('tasks/:taskId')
  @ApiOperation({ summary: 'Update team task' })
  updateTeamTask(@Param('taskId') taskId: string, @Req() req: any, @Body() body: any) {
    return this.teamsService.updateTeamTask(taskId, req.user.id, body)
  }

  @Delete('tasks/:taskId')
  @ApiOperation({ summary: 'Delete team task' })
  deleteTeamTask(@Param('taskId') taskId: string, @Req() req: any) {
    return this.teamsService.deleteTeamTask(taskId, req.user.id)
  }

  // ── Comments ─────────────────────────────────────────────────────
  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  addComment(@Param('taskId') taskId: string, @Req() req: any, @Body() body: { content: string }) {
    return this.teamsService.addComment(taskId, req.user.id, body.content)
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  deleteComment(@Param('commentId') commentId: string, @Req() req: any) {
    return this.teamsService.deleteComment(commentId, req.user.id)
  }
}