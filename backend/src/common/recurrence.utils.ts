import { PrismaService } from '../prisma/prisma.service'
import { NotFoundException } from '@nestjs/common'
import { getNextDueDate } from './date.utils'

interface RecurrenceTaskData {
  userId: string
  title: string
  description: string | null
  priority: string
  projectId: string | null
  recurrence: string
  recurrenceEndDate: Date | null
  parentTaskId: string | null
  id: string
  dueDate: Date | null
  teamId?: string | null
  assigneeId?: string | null
  tags?: { id: string }[]
}

export async function createNextOccurrence(
  prisma: PrismaService,
  task: RecurrenceTaskData,
  opts?: { connectTags?: boolean }
) {
  if (task.recurrence === 'NONE') throw new NotFoundException('Task is not recurring')

  const nextDueDate = getNextDueDate(task.dueDate, task.recurrence)

  if (task.recurrenceEndDate && nextDueDate > task.recurrenceEndDate) {
    return { message: 'Recurrence has ended', created: false }
  }

  const nextTask = await prisma.task.create({
    data: {
      userId: task.userId,
      title: task.title,
      description: task.description,
      priority: task.priority as any,
      status: 'TODO',
      projectId: task.projectId,
      recurrence: task.recurrence as any,
      recurrenceEndDate: task.recurrenceEndDate,
      parentTaskId: task.parentTaskId || task.id,
      dueDate: nextDueDate,
      ...(task.teamId ? { teamId: task.teamId } : {}),
      ...(task.assigneeId ? { assigneeId: task.assigneeId } : {}),
      ...(opts?.connectTags && task.tags?.length
        ? { tags: { connect: task.tags.map(t => ({ id: t.id })) } }
        : {}),
    },
    include: {
      project: { select: { name: true, color: true } },
      ...(opts?.connectTags ? { tags: true } : {}),
    },
  })

  return { message: 'Next occurrence created', created: true, task: nextTask }
}

export async function skipNextOccurrence(
  prisma: PrismaService,
  task: RecurrenceTaskData,
  opts?: { connectTags?: boolean }
) {
  if (task.recurrence === 'NONE') throw new NotFoundException('Task is not recurring')

  const skippedDate = getNextDueDate(task.dueDate, task.recurrence)
  const nextDueDate = getNextDueDate(skippedDate, task.recurrence)

  if (task.recurrenceEndDate && nextDueDate > task.recurrenceEndDate) {
    return { message: 'Recurrence has ended', created: false }
  }

  const nextTask = await prisma.task.create({
    data: {
      userId: task.userId,
      title: task.title,
      description: task.description,
      priority: task.priority as any,
      status: 'TODO',
      projectId: task.projectId,
      recurrence: task.recurrence as any,
      recurrenceEndDate: task.recurrenceEndDate,
      parentTaskId: task.parentTaskId || task.id,
      dueDate: nextDueDate,
      ...(task.teamId ? { teamId: task.teamId } : {}),
      ...(task.assigneeId ? { assigneeId: task.assigneeId } : {}),
      ...(opts?.connectTags && task.tags?.length
        ? { tags: { connect: task.tags.map(t => ({ id: t.id })) } }
        : {}),
    },
    include: {
      project: { select: { name: true, color: true } },
      ...(opts?.connectTags ? { tags: true } : {}),
    },
  })

  return { message: 'Occurrence skipped', created: true, task: nextTask }
}
