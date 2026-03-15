import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Runs daily at midnight and automatically creates the next occurrence for any
 * recurring task that has been completed and has no pending child task yet.
 */
@Injectable()
export class RecurringTasksScheduler {
  private readonly logger = new Logger(RecurringTasksScheduler.name)

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringTasks() {
    this.logger.log('Recurring tasks check started')

    // Find completed recurring tasks that are the "leaf" of their chain
    // (no child task exists yet, meaning no next occurrence has been generated)
    const tasks = await this.prisma.task.findMany({
      where: {
        recurrence: { not: 'NONE' },
        status: 'DONE',
        childTasks: { none: {} },
      },
      include: { tags: true },
    })

    let created = 0
    for (const task of tasks) {
      const nextDueDate = this.getNextDueDate(task.dueDate, task.recurrence as string)

      // Skip if recurrence window has closed
      if (task.recurrenceEndDate && nextDueDate > task.recurrenceEndDate) continue

      await this.prisma.task.create({
        data: {
          userId: task.userId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'TODO',
          projectId: task.projectId,
          recurrence: task.recurrence,
          recurrenceEndDate: task.recurrenceEndDate,
          parentTaskId: task.parentTaskId || task.id,
          dueDate: nextDueDate,
          tags: { connect: task.tags.map(t => ({ id: t.id })) },
        },
      })
      created++
    }

    this.logger.log(`Recurring tasks check complete — ${created} occurrence(s) created`)
  }

  private getNextDueDate(currentDue: Date | null, recurrence: string): Date {
    const base = currentDue ? new Date(currentDue) : new Date()
    switch (recurrence) {
      case 'DAILY':    base.setDate(base.getDate() + 1);         break
      case 'WEEKLY':   base.setDate(base.getDate() + 7);         break
      case 'BIWEEKLY': base.setDate(base.getDate() + 14);        break
      case 'MONTHLY':  base.setMonth(base.getMonth() + 1);       break
      case 'YEARLY':   base.setFullYear(base.getFullYear() + 1); break
    }
    return base
  }
}
