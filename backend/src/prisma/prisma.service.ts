import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'async_hooks'

export interface ActorContext {
  id: string
  firstName: string
  lastName: string
  email: string
}

// Module-level storage so the $use callback can read the actor even when Prisma
// invokes it outside the class-instance context.
const actorStorage = new AsyncLocalStorage<ActorContext>()

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Intercept task mutations to write audit logs automatically.
    // $use() is Prisma's middleware API (deprecated in favour of $extends but
    // still fully functional in Prisma 5). $extends() returns a *new* client
    // object which would break NestJS DI; $use() lets us intercept on the
    // injected instance directly without touching any consuming service.
    this.$use(async (params, next) => {
      if (params.model !== 'Task') return next(params)

      const actor = actorStorage.getStore()

      // ── CREATE ────────────────────────────────────────────────────
      if (params.action === 'create') {
        const result = await next(params)
        if (actor && result?.id) {
          await this.taskActivity.create({
            data: {
              taskId: result.id,
              actorId: actor.id,
              actorName: `${actor.firstName} ${actor.lastName}`,
              actorEmail: actor.email,
              action: 'created',
              newValue: result.title,
            },
          })
        }
        return result
      }

      // ── UPDATE ────────────────────────────────────────────────────
      if (params.action === 'update') {
        // No actor → system/cron operation, skip logging
        if (!actor) return next(params)

        // Capture before-state for field-level diff
        const before = await this.task.findUnique({
          where: params.args.where,
          select: { title: true, status: true, priority: true, assigneeId: true, dueDate: true },
        })

        const result = await next(params)

        if (before) {
          const data = params.args.data as any
          const actorName = `${actor.firstName} ${actor.lastName}`
          const changes: { field: string; oldValue: string; newValue: string }[] = []

          if (data.status && data.status !== before.status)
            changes.push({ field: 'status', oldValue: before.status, newValue: data.status })

          if (data.priority && data.priority !== before.priority)
            changes.push({ field: 'priority', oldValue: before.priority, newValue: data.priority })

          if ('assigneeId' in data && data.assigneeId !== before.assigneeId)
            changes.push({
              field: 'assignee',
              oldValue: before.assigneeId ?? 'none',
              newValue: data.assigneeId ?? 'none',
            })

          if (data.dueDate instanceof Date && before.dueDate?.toISOString() !== data.dueDate.toISOString())
            changes.push({
              field: 'dueDate',
              oldValue: before.dueDate?.toLocaleDateString() ?? 'none',
              newValue: data.dueDate.toLocaleDateString(),
            })

          if (data.title && data.title !== before.title)
            changes.push({ field: 'title', oldValue: before.title, newValue: data.title })

          for (const change of changes) {
            await this.taskActivity.create({
              data: {
                taskId: result.id,
                actorId: actor.id,
                actorName,
                actorEmail: actor.email,
                action: `${change.field}_changed`,
                field: change.field,
                oldValue: change.oldValue,
                newValue: change.newValue,
              },
            })
          }
        }

        return result
      }

      return next(params)
    })

    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  /**
   * Run `fn` with actor context so the audit-log middleware knows who triggered
   * the task mutation. Wrap `prisma.task.create/update` calls with this whenever
   * an authenticated user is responsible for the change.
   */
  runWithActor<T>(actor: ActorContext, fn: () => Promise<T>): Promise<T> {
    return actorStorage.run(actor, fn)
  }
}
